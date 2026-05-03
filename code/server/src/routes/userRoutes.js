const router = require('express').Router();
const userController = require('../controllers/userController');

router.get('/', userController.list);
router.post('/', userController.create);
router.put('/:id', userController.update);

module.exports = router;
