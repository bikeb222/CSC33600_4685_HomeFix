const router = require('express').Router();
const providerController = require('../controllers/providerController');

router.post('/register', providerController.register);
router.get('/', providerController.list);
router.get('/service-approvals', providerController.listServiceApprovals);
router.put('/:providerId/services/:serviceId/review', providerController.reviewService);
router.get('/:id/unavailable-blocks', providerController.listUnavailableBlocks);
router.post('/:id/unavailable-blocks', providerController.addUnavailableBlock);
router.delete('/:id/unavailable-blocks/:blockId', providerController.removeUnavailableBlock);
router.get('/:id/services', providerController.listServices);
router.post('/:id/services', providerController.addService);
router.delete('/:providerId/services/:serviceId', providerController.removeService);
router.get('/:id', providerController.getById);
router.put('/:id', providerController.update);
router.delete('/:id', providerController.remove);

module.exports = router;
