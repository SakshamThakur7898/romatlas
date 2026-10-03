import { Router } from 'express';
import { addBookmark, removeBookmark, getBookmarks, getFollowing, getNotifications } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { objectIdParam } from '../middleware/params';

export const userRouter = Router();
userRouter.param('targetId', objectIdParam);
userRouter.use(authenticate);

userRouter.get('/bookmarks', getBookmarks);
userRouter.get('/following', getFollowing);
userRouter.get('/notifications', getNotifications);
userRouter.post('/bookmarks', addBookmark);
userRouter.delete('/bookmarks/:targetId', removeBookmark);
