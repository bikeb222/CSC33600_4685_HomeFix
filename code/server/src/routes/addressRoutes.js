const router = require('express').Router();
const addressController = require('../controllers/addressController');

router.get('/receivers/:receiverId/addresses', addressController.listForReceiver);
router.post('/receivers/:receiverId/addresses', addressController.create);
router.put('/receivers/:receiverId/addresses/:addressId/default', addressController.setDefault);
router.put('/addresses/:id', addressController.update);
router.delete('/addresses/:id', addressController.remove);

module.exports = router;
