import express from 'express';
import { getCatalog } from '../controllers/catalogController.js';

const router = express.Router();

router.get('/', getCatalog);

export default router;
