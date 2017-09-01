require('dotenv').config();
const express = require('express');
const s3o = require('s3o-middleware');
const helmet = require('helmet');
const express_enforces_ssl = require('express-enforces-ssl');

const app = express();

if(process.env.NODE_ENV !== 'local') {
	app.use(helmet());
	app.enable('trust proxy');
	app.use(express_enforces_ssl());
}

app.use(s3o);

app.get('/keysFor/:project', (req, res) => {
	const validUser = checkUser(req.cookies.s3o_username);
	if(validUser) {
		const keys = formatKeys(req.params.project);
		const hasKeys = keysExist(keys);

		if(hasKeys) {
			return res.json({'key': process.env[keys.key], 'secret': process.env[keys.secret]});
		} else {
			return res.json({'error': 'The keys for this resource don\'t exist.'});
		}
	}

	return res.json({'error': 'You are not allowed to get keys for this resource.'});
});

function checkUser(user) {
	if(user !== undefined) {
		return process.env.USER_WHITELIST.indexOf(user) > -1;
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
