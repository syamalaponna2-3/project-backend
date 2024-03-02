
import { Router } from "express";
const router = Router();
const faculty = require('../models/faculty');
const user = require('../models/auth')
const nodemailer = require('nodemailer');
import Event from "../models/Event";
import { Request,Response,NextFunction } from "express";
import test from "node:test";
import { resourceLimits } from "node:worker_threads";
const Feedback = require('../models/Feedback')
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
const quires = require('../models/Quires')

// Section -A

type login={
    email:String,
    password:String
}
//admin login router
router.post('/login',async(req:Request,res:Response,next:NextFunction)=>{
    const {email,password} = req.body as login;
    try{
        if(email === "admin@gmail.com" && password === 'admin'){
            res.status(200).json({
                success:true,
                message:"sucessfull login"
            })
        }else{
            res.status(400).json({
                success:false,
                message:"invaid username and password"
            })
        }

    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})



router.get('/events', async (req: any, res: Response, next: NextFunction) => {
    const studentId = req.params.studentId;

    try {

        // Find all events
        const events = await Event.find();
        const currentDate = Date.now();

        // Filter events for the future and positive strength
        const futureEvents = events.filter((event: any) => event.to_date.getTime() > currentDate && event.strength > 0);

        if (futureEvents.length > 0) {
            res.status(200).json({
                success: true,
                futureEvents
            });
        } else {
            res.status(404).json({
                success: false,
                message: "No matching events found"
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
















//admin get all faculty router
router.get('/faculty',async(req:Request,res:Response,next:NextFunction)=>{
    try{
        const facultys = await faculty.find();
        if(!facultys){
            res.status(400).json({
                success:false,
                message:"no faculty register"
            })
        }else{
            res.status(200).json({
                success:true,
                facultys
            })
        }
    }catch(error){
        console.log(error);
        res.status(500).json({
            sucess:false,
            message:"internal server error"
        })
    }
})

router.get('/faculty/:facultyId',async(req:Request,res:Response,next:NextFunction)=>{
    const facultyId = req.params.facultyId;
    try{
        const facultys = await faculty.findById(facultyId);
        if(!facultys){
            res.status(400).json({
                success:false,
                message:"no faculty register"
            })
        }else{
            res.status(200).json({
                success:true,
                facultys
            })
        }
    }catch(error){
        console.log(error);
        res.status(500).json({
            sucess:false,
            message:"internal server error"
        })
    }
})




const storages = multer.diskStorage({
    destination: 'faculty',
    filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const uploads = multer({ storage: storages });



//update the faculty
router.put('/faculty/:facultyId', uploads.fields([{ name: 'Avathar', maxCount: 1 }]), async (req: any, res: Response, next: NextFunction) => {
    const facultyId = req.params.facultyId;
    try {
        const existingfaculty = await faculty.findById(facultyId);
        if (!existingfaculty) {
            return res.status(404).json({
                success: false,
                message: "faculty not found"
            });
        }

        const { email, mobileNumber, name,department,colleage } = req.body;

        const  updateimage = req.files['Avathar'] ? req.files['Avathar'][0].filename : existingfaculty.Avathar

        const updatedUser = await faculty.findByIdAndUpdate(facultyId,{
            email, mobileNumber, name,department,colleage,
            Avathar:updateimage
        },{new:true})

        // Update the user's information 
       if(updatedUser){
        res.status(200).json({
            success: true,
            user: updatedUser
        })
    }else{
        res.status(400).json({
            success: false,
            message:"some went wroung try after some time"
        })
    }

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


//delete the faculty
router.delete('/faculty/:id',async(req:Request,res:Response,next:NextFunction)=>{
    const id = req.params.id;
    try{
        const facult = await faculty.findById(id)
        if(!facult){
            res.status(404).json({
                success:false,
                message:"faculty not found"
            })
        }else{
            await faculty.findByIdAndDelete(id);
            res.status(200).json({
                success:true,
                message:"deleted successfully"
            })

        }

    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})


//admin get all students router
router.get('/students',async(req:Request,res:Response,netx:NextFunction)=>{
    try{
        const users = await user.find()
        if(!users){
            res.status(400).json({
                success:false,
                message:"no students found"
            })
        }else{
            res.status(200).json({
                success:true,
                users
            })
        }

    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})


//admin get by search method
router.get('/student',async(req:Request,res:Response,netx:NextFunction)=>{
    try{
        const student = req.query.student;
        const users = await user.find({name:{$regex : student ,Option:'i'}})
        if(!users){
            res.status(400).json({
                success:false,
                message:"no students found"
            })
        }else{
            res.status(200).json({
                success:true,
                users
            })
        }

    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})



router.get('/allevents',async(req:Request,res:Response,netx:NextFunction)=>{
    try{
        const title = req.query.title;
        const events = await Event.find({title:{$regex : title ,Option:'i'}})
        if(!events){
            res.status(400).json({
                success:false,
                message:"no students found"
            })
        }else{
            res.status(200).json({
                success:true,
                events
            })
        }

    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})











//admin get particular student 
router.get('/student/:studentId', async (req: Request, res: Response, next: NextFunction) => {
    const studentId = req.params.studentId;
    try {
        const student = await user.findById(studentId);
        if (!student) {
            res.status(404).json({
                success: false,
                message: "no user not found"
            })
        }
        res.status(200).json({
            success: true,
            user: student
        })

    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: "internal server error"
        })
    }
})

const storage = multer.diskStorage({
    destination: 'students',
    filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const upload = multer({ storage: storage });


// admin can update the student 
router.put('/student/:studentId', upload.fields([{ name: 'Avatar', maxCount: 1 }]), async (req: any, res: any, next: NextFunction) => {
    const studentId = req.params.studentId;
    try {
        const existingUser = await user.findById(studentId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const { email, password, mobileNumber, name } = req.body;

        const updatedImage = req.files['Avatar'] ? req.files['Avatar'][0].filename : existingUser.Avatar;

        // Update the user's information

        const updatedUser = await user.findByIdAndUpdate(studentId,{
            email, mobileNumber, name,password,
            Avatar:updatedImage,
        },{new:true})
       if(updatedUser){
        res.status(200).json({
            success: true,
            user: updatedUser,
        })}else{
            res.status(400).json({
                success: false,
                message:"som went wroung try after some time"
            })
            

        }

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


//admin can delete student
router.delete('/student/:studentId', async (req: Request, res: Response, next: NextFunction) => {
    const studentId = req.params.studentId;
    try {
        const users = await user.findById(studentId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "no user not found"
            })
        }

        await user.findByIdAndDelete(studentId)
        res.status(200).json({
            success: true,

        })

    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: "internal server error"
        })
    }

})







//section-B


//admin get all event router
router.get('/event',async(req:Request,res:Response,next:NextFunction)=>{
    try{
        const event =  await Event.find();
        if(event){
            res.status(200).json({
                success:true,
                event
            })
        }else{
            res.status(404).json({
                success:false,
                message:"no event found"
            })
        }
        

    }catch(error){
        console.log(error);
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})

//admin get all event by facultyid router
router.get('/event/faculty/:facultyId',async(req:Request,res:Response,next:NextFunction)=>{
    const {facultyId} = req.params;
    try{
        const events = await Event.find({faculty:facultyId});       
       
        if(events.length > 0){
            res.status(200).json({
                success:true,
                events
            })
        }else{
            res.status(404).json({
                success:false,
                messsage:"no event found"
            })

        }


    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            messsage:"internal server error"
        })
    }
    
})


//admin get all event by eventid router
router.get('/events/:eventId',async(req:Request,res:Response,next:NextFunction)=>{
    const {eventId} = req.params ;
    try{
        const events = await Event.findById(eventId);
        if(events){
            res.status(200).json({
                success:true,
                message:"events",
                events
            })
        }else{
            res.status(404).json({
                success:false,
                messsage:"no event found"
            })

        }


    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            messsage:"internal server error"
        })
    }
    
})

//admin update the event 

const store = multer.diskStorage({
    destination: 'events', // Make sure this directory exists or is created dynamically
    filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const uploaded = multer({ storage: store });

router.put('/updateevent/:eventId', uploaded.array('pic', 1), async (req:any, res:any, next:NextFunction) => {
    const eventId = req.params.eventId;

    try {
        // Find the event by ID
        const eventToUpdate = await Event.findById(eventId);
        if (!eventToUpdate) {
            return res.status(404).json({
                success: false,
                message: "No event found with this ID"
            });
        }

        // Convert 'to_date' to a Date object
        const currentDate = new Date();
        const eventToDate = new Date(eventToUpdate.to_date);

        // Check if the event's 'to_date' is in the future
        if (eventToDate < currentDate) {
            return res.status(400).json({
                success: false,
                message: "Cannot update past events"
            });
        }

        // Update the event properties with the provided data
        const { title, from_date, to_date, start_time, end_time, participants, strength, amount } = req.body;
        const updateimage = req.files[0] ? req.files[0].filename : eventToUpdate.pic;

        if (title) eventToUpdate.title = title;
        if (from_date) eventToUpdate.from_date = from_date;
        if (to_date) eventToUpdate.to_date = to_date;
        if (start_time) eventToUpdate.start_time = start_time;
        if (end_time) eventToUpdate.end_time = end_time;
        if (participants) eventToUpdate.participants = participants;
        if (strength) eventToUpdate.strength = parseInt(strength, 10);
        if (updateimage) eventToUpdate.pic = updateimage;
        if (amount !== undefined) {
            const parsedAmount = parseFloat(amount);
            if (!isNaN(parsedAmount)) {
                eventToUpdate.amount = parsedAmount;
            } else {
                // Handle invalid amount value
                return res.status(400).json({
                    success: false,
                    message: "Invalid amount value"
                });
            }
        }

        // Save the updated event
        const updatedEvent = await eventToUpdate.save();

        res.status(200).json({
            success: true,
            event: updatedEvent
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});




//admin delete the event
router.delete('/event/:eventId',async(req:Request,res:Response,next:NextFunction) =>{
    const eventId = req.params.eventId;
    try{
        const event = await Event.findById(eventId)
        if(!event){
            res.status(404).json({
                success:false,
                message:"no intern found in this id"
            })
        }
        await Event.findByIdAndDelete(eventId)
        res.status(200).json({
            success:true,
            message:"event sucessfull deleted"
        })

    }catch(error){
        res.status(500).json({
            success:false,
            messsage:"internal server error"
        })
    }

})




//admin get the all feedbacks
router.get('/events',async(req:Request,res:Response,next:NextFunction)=>{
    try{
        const feedbacks = await Feedback.find();
        if(feedbacks){
            res.status(200).json({
                success:true,
                feedbacks
            })
        }else{
            res.status(400).json({
                success:false,
                message:"some want wroung try after some time..."
            })
        }
    }catch(error){
        console.log(error);
        res.status(500).json({
            success:false,
            messsage:"internal server error"
        })

    }
    
})

//admin get the perticular event feedbacks
router.get('/event/eventId',async(req:Request,res:Response,next:NextFunction)=>{
    const eventId = req.params.eventId;
    try{
        const event = await Feedback.find({event:eventId});
        if(!event){
            res.status(404).json({
                success:false,
                message:"no event found in feedbackform"
            })
        }else{
            res.status(200).json({
                success:true,
                event
            })
        }

    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})


//admin get the all quires
router.get('/quires', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quire = await quires.find();
        if (quire.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No quires found"
            });
        }
        const filteredQuires = quire.filter((quire: any) => {
            // Filter quires based on their date, modify as per your requirement
            // For example, filtering quires which are created in the last 24 hours
            return (Date.now() - quire.date.getTime()) / (1000 * 60 * 60) < 24;
        });
        return res.status(200).json({
            success: true,
            quires: filteredQuires
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});















//events filter 


module.exports = router