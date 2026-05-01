import { Router } from 'express';
import { searchLocations, reverseLocation } from '../controllers/geoController.js';

const router = Router();

router.get('/search', searchLocations);
router.get('/reverse', reverseLocation);

export default router;
