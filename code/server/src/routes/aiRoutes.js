const router = require('express').Router();
const aiController = require('../controllers/aiController');

router.post('/receiver/chat', aiController.receiverChat);
router.post('/manager/chat', aiController.managerChat);

module.exports = router;
