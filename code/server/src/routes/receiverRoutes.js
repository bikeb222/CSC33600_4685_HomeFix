const router = require('express').Router();
const receiverController = require('../controllers/receiverController');

router.post('/register', receiverController.register);
router.get('/', receiverController.list);
router.get('/:id', receiverController.getById);
router.put('/:id', receiverController.update);
router.delete('/:id', receiverController.remove);

module.exports = router;
