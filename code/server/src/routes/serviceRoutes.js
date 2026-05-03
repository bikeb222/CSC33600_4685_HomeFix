const router = require('express').Router();
const serviceController = require('../controllers/serviceController');

router.get('/', serviceController.list);
router.get('/:id', serviceController.getById);
router.post('/', serviceController.create);
router.put('/:id', serviceController.update);
router.delete('/:id', serviceController.remove);

module.exports = router;
