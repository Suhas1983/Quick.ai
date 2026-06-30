import express from "express";
import {auth} from "../middlewares/auth.js";
import {generateArticle, generateBlogTitle, generateImage, removeImageBackground, removeImageObject, resumeReview} from "../controllers/AiController.js";
import { upload } from "../configs/multer.js";

const AiRouter=express.Router();

AiRouter.post('/generate-article',auth,generateArticle)
AiRouter.post('/generate-blog-title',auth,generateBlogTitle)
AiRouter.post('/generate-image',auth,generateImage)
AiRouter.post('/remove-image-background', upload.single('image'), auth, removeImageBackground)
AiRouter.post('/remove-image-object',upload.single('image'),auth,removeImageObject)
AiRouter.post('/resume-review',upload.single('resume'),auth,resumeReview)

export default AiRouter