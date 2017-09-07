require('dotenv').config();
const express = require('express');
const s3o = require('s3o-middleware');
const helmet = require('helmet');
const express_enforces_ssl = require('express-enforces-ssl');
const path = require('path');
const clipboard = require('copy-paste').global();

const app = express();

if(process.env.NODE_ENV !== 'local') {
	app.use(helmet());
	app.enable('trust proxy');
	app.use(express_enforces_ssl());
}

app.use(s3o);
app.use(express.static(path.join(__dirname + '/project')));

app.get('/keysFor/:project', (req, res) => {
	const validUser = checkUser(req.cookies.s3o_username);
	let response;

	if(validUser) {
		const keys = formatKeys(req.params.project);
		const hasKeys = keysExist(keys);

		if(hasKeys) {
			response = {'key': process.env[keys.key], 'secret': process.env[keys.secret]};
		} else {
			response = {'error': 'The keys for this resource don\'t exist.', 'errorType': '404'};
		}
	} else {
		response = {'error': 'You are not allowed to get keys for this resource.', 'errorType': '403'};
	}

	if(response.key !== undefined) {
		const responseText = JSON.stringify(response);
		
		return clipboard.copy(responseText, () => {
			console.log('hasCopied', responseText);
			return res.sendFile(path.join(__dirname + '/project/' + req.params.project + '.html'));
		});
	}

	res.status(response.errorType).send(response.error);
});

function checkUser(user) {
	if(user !== undefined) {
		const whitelist = (!!process.env.USER_WHITELIST)?process.env.USER_WHITELIST.split(','):[];
		return whitelist.indexOf(user) > -1;
	}

	return false;
}

function formatKeys(project) {
	const formatProject = project.replace('-','_').toUpperCase();
	return {'key': formatProject + '_KEY', 'secret': formatProject + '_SECRET'};
}

function keysExist(keys) {
	return (!!process.env[keys.key] && !!process.env[keys.secret]);
}

app.listen(process.env.PORT || 2017);
