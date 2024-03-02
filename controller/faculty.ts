import { Router } from "express";
const router = Router();
const faculty = require('../models/faculty');
const nodemailer = require('nodemailer');
import Problems from "../models/Problems";
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Event from '../models/Event'
import { Request,Response,NextFunction } from "express";
import Registerevent from "../models/Registerevent";
const Feedback = require('../models/Feedback')




//section-A faulty crud opration


// Generate a random 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendVerificationEmail = async (email:any, otp:any) => {
    // Use nodemailer or any other email sending service to send the OTP to the user's email
    // Example using nodemailer
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'thanushaporalla@gmail.com', //your email address
            pass: 'mjpw spzz vhpk exfm' // your app password
        },
        connectionTimeout: 10000, // 10 seconds
        timeout: 10000, // 10 seconds
        secure: true
    });

    const mailOptions = {
        from: 'thanushaporalla@gmail.com',  //your email address
        to: email,
        subject: 'Email Verification',
        text: `Your verification code is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
};



const storages = multer.diskStorage({
    destination: 'faculty',
    filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const uploads = multer({ storage: storages });



router.post('/registerfaculty', uploads.fields([{ name: 'Avathar', maxCount: 1 }]), async (req: any, res: Response, next: NextFunction) => {
    const { email, password, mobileNumber, name, college, department } = req.body;

    try {
        if (!email.endsWith('@ksrmce.ac.in')) {
            return res.status(400).json({ success: false, message: 'Email must end with @ksrmce.ac.in' });
        }
        // Check if the email is already registered and verified
        const existingUser = await faculty.findOne({ email });

        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ success: false, message: 'Email already registered and verified' });
        }

        if (existingUser && !existingUser.isVerified) {
            // User exists but is not verified
            // Generate and store a new verification code
            const newVerificationCode = generateOTP();

            // Update existing user with the new verification code
            existingUser.verificationCode = newVerificationCode;
            await existingUser.save();

            // Resend verification email with the new code
            await sendVerificationEmail(email, newVerificationCode);

            return res.status(400).json({ success: false, message: 'Email already registered but not verified. Resent verification email with a new code.' });
        }

        // Check if Avathar field is missing
        if (!req.files || !req.files['Avathar'] || !req.files['Avathar'][0]) {
            return res.status(400).json({
                success: false,
                message: "Avathar file is missing",
            });
        }

        // Generate and store verification code
        const verificationCode = generateOTP();

        // Save user to the database
        const newUser = new faculty({
            email,
            password,
            mobileNumber,
            name,
            verificationCode,
            college,
            department,
            Avathar: req.files['Avathar'][0].filename, // Save filename of the uploaded avatar
        });

        await newUser.save();

        // Send verification email
        await sendVerificationEmail(email, verificationCode);

        res.status(201).json({ success: true, message: 'User registered successfully. Check your email for verification.',newUser:newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});



//verify the otp
router.post('/verify/:facultyId',async(req:Request,res:Response,next:NextFunction)=>{
    const facultyId = req.params.facultyId;
    const {  otp } = req.body;

    try {
        // Find user by email
       const users = await faculty.findById(facultyId)

        if (!users) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if the OTP matches
        if (users.verificationCode === otp) {
            // Update user as verified
            users.isVerified = true;
            await users.save();

            res.status(200).json({ success: true, message: 'Email verified successfully' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid verification code' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
})

type Login = {
    email: string;
    password: string;
    isVerified?: boolean;
};



//login the faculty
router.post('/login',async(req:Request,res:Response,next:NextFunction)=>{
    const {email,password} = req.body;
    try{
        const checkfaculty = await faculty.findOne({email:email,password:password}) as Login
        if(!checkfaculty){
            res.status(404).json({
                success:false,
                message:"no user found in this email and paswword"
            })
        }else if(!checkfaculty.isVerified){
            res.status(404).json({
                success:false,
                message:"user not verified"
            })
        }
        else{
        res.status(200).json({
            success:true,
            checkfaculty,
            message:"successfull register"
        })}

    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})


//forgot password
router.put('/forgot/:facultyId', async(req:Request,res:Response, next:NextFunction) =>{
    const facultyId = req.params.facultyId;
    try{
        const student = await faculty.findById(facultyId);
        if(!student){
            res.status(404).json({
                success:false,
                message:"no user found in this id"
            })
        }
        const {email,newpassword} = req.body;
        const checkemail =  await student.find({email:{$in:email}});
        if(!checkemail){
            res.status(400).json({
                success:false,
                message:"invalid email address"
            })
        }
        const update = await faculty.findByIdAndUpdate(facultyId,{password:newpassword})
        if(update){
            res.status(200).json({
                success:true,
                message:"update sucessfully"
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




//get their details faculty
router.get('/faculty/:id',async(req:Request,res:Response,next:NextFunction)=>{
    const id = req.params.id
    try{
        const users = await faculty.findById(id)
        if(!users){
            res.status(404).json({
                success:false,
                message:"no user not found"
            })
        }
        res.status(200).json({
            success:true,
            faculty:users
        })

    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})

//change their details faculty
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

        const { email, mobileNumber, name } = req.body;

        const  updateimage = req.files['Avathar'] ? req.files['Avathar'][0].filename : existingfaculty.Avathar

        const updatedUser = await faculty.findByIdAndUpdate(facultyId,{
            email, mobileNumber, name,
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



//delete their profile faculty
router.delete('/fcaulty/:id',async(req:Request,res:Response,next:NextFunction)=>{
    const id = req.params
    try{
        const facult = await faculty.findById(id)
        if(!facult){
            res.status(404).json({
                success:false,
                message:"faculty not found"
            })
        }else{
            await facult.findByIdAnd
        }

    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})



//section-B faculty event crud operation




const storage = multer.diskStorage({
    destination: 'events', // Make sure this directory exists or is created dynamically
    filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const upload = multer({ storage: storage });

type event = {
    title: string;
    from_date: Date;
    to_date: Date;
    start_time: string;
    end_time: string;
    participants: string;
    strength: number;
    year:string,
    department:string,
    others:string,
    clubs:string,
    organized:string,
    description:string,
    location:string,
    amount?: number;
    pic: string[];
}

// POST event
router.post('/event/:facultyId', upload.array('pic', 1), async (req: any, res: any, next: NextFunction) => {
    const facultyId = req.params.facultyId;
    try {
        const facultyObj = await faculty.findById(facultyId);
        if (!facultyObj) {
            return res.status(404).json({
                success: false,
                message: "No faculty found with this ID"
            });
        }

        const { title, from_date, to_date, start_time, end_time,location, participants,organized, strength,description, amount, others, department, clubs, year } = req.body;
        const pic = req.files.map((file: Express.Multer.File) => file.filename);

        const eventData: Partial<event> = {
            title,
            from_date,
            to_date,
            start_time,
            end_time,
            participants,
            year,
            department,
            others,
            clubs,
            description,
            organized,
            location,
            strength: parseInt(strength, 10), // Assuming strength should be a number
            pic
        };
        if (from_date > to_date) {
            return res.status(400).json({
                success: false,
                message: "Invalid date"
            });
        }
        if (amount !== undefined) {
            const parsedAmount = parseFloat(amount);
            if (!isNaN(parsedAmount)) {
                eventData.amount = parsedAmount;
            } else {
                // Handle invalid amount value
                return res.status(400).json({
                    success: false,
                    message: "Invalid amount value"
                });
            }
        }

        // Create an 'Event' object (assuming you have the 'Event' type defined/imported)
        const event = await Event.create({
            faculty: facultyId, // Set the facultyId
            ...eventData // Spread the eventData properties
        });

        res.status(201).json({
            success: true,
            event
        });
    } catch (error) {
        next(error); // Pass the error to the next error handling middleware
    }
});





//get all event by facultyid
router.get('/event/:facultyId', async (req: Request, res: Response, next: NextFunction) => {
    const facultyId = req.params.facultyId; // Corrected parameter name
    try {
        const facult = await faculty.findById(facultyId);
        if (!facult) {
            return res.status(404).json({ // Changed status code to 404 (Not Found)
                success: false,
                message: "No faculty found with this ID"
            });
        }

        const events = await Event.find({ faculty: facultyId });
        if (events.length > 0) { // Check if events array is not empty
            res.status(200).json({
                success: true,
                events
            });
        } else {
            res.status(404).json({ // Changed status code to 404 (Not Found) for consistency
                success: false,
                message: "Faculty has not posted any events"
            });
        }

    } catch (error) {
        console.error(error); // It's better to use console.error for errors
        next(error); // Use next to pass errors to Express's error handling middleware
    }
});


//get particualtr event by event id
router.get('/event/:facultyId/:eventId',async(req:Request,res:Response,next:NextFunction)=>{
    const{facultyId,eventId} =req.params;
    try{
        const checkevent  = await Event.find({faculty:facultyId,_id:eventId});
        if(!checkevent){
            res.status(400).json({
                success:false,
                message:"not data found "
            })
        }else{
            res.status(200).json({
                success:true,
                checkevent
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


//update the event by id
router.put('/event/:facultyId/:eventId', upload.array('pic', 1) , async (req: any, res: any, next: NextFunction) => {
    const facultyId = req.params.facultyId;
    const eventId = req.params.eventId;

    try {
        // Find the faculty
        const facultyObj = await faculty.findById(facultyId);
        if (!facultyObj) {
            return res.status(404).json({
                success: false,
                message: "No faculty found with this ID"
            });
        }

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
        const updateimage = req.files && req.files.length > 0 ? req.files[0].filename : eventToUpdate.pic;

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
        await eventToUpdate.save();

        res.status(200).json({
            success: true,
            event: eventToUpdate
        });
    } catch (error) {
        next(error); // Pass the error to the next error handling middleware
    }
});




//event delete by faculty
router.delete('/event/:facultyId/:eventId',async(req:Request,res:Response,next:NextFunction)=>{
    const {facultyId,eventId} = req.params
    try{
        const event = await Event.find({_id:eventId,facutly:facultyId});
        if(!event){
            res.status(400).json({
                success:false,
                messsage:"no event found"

            })
        }
        await Event.findByIdAndDelete(eventId)
        res.status(200).json({
            success:true,
            message:"deleted success"
        })
    }catch(error){
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
})


// get the past event faculty


router.get('/pastevent/:facultyId', async (req: any, res: Response, next: NextFunction) => {
    const facultyId = req.params.facultyId;

    try {
        const currentDate = new Date();
        const events = await Event.find({ faculty: facultyId });
        const pastEvents = events.filter((item: any) => {
            return item.to_date < currentDate;
        });

        if (pastEvents.length > 0) {
            // Group past events by month
            const pastEventsByMonth: {[key: string]: any[]} = {};
            pastEvents.forEach((event: any) => {
                const monthYear = `${event.to_date.getMonth() + 1}-${event.to_date.getFullYear()}`;
                if (!pastEventsByMonth[monthYear]) {
                    pastEventsByMonth[monthYear] = [];
                }
                pastEventsByMonth[monthYear].push(event);
            });

            res.status(200).json({
                success: true,
                pastEvents: pastEventsByMonth
            });
        } else {
            res.status(404).json({
                success: false,
                message: "No past events"
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



//get the upcome events
router.get('/futureevent/:facultyId', async (req: any, res: Response, next: NextFunction) => {
    const facultyId = req.params.facultyId;

    try {
        const currentDate = new Date();
        const events = await Event.find({ faculty: facultyId });
        const pastevent = events.filter((item: any) => {
            return item.to_date > currentDate;
        });

        if (pastevent.length > 0) {
            res.status(200).json({
                success: true,
                pastevent
            });
        } else {
            res.status(404).json({
                success: false,
                message: "No past events"
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



//faculty get register students
router.get('/students/:facultyId', async (req: Request, res: Response, next: NextFunction) => {
    const  facultyId  = req.params.facultyId;
    try {
        const events = await Event.findOne({faculty: facultyId }); // Use findOne to find a single event
        console.log(events);

        if (!events) {
            return res.status(400).json({
                success: false,
                message: "No event found with this ID"
            });
        }
        const student = await Registerevent.find({event:events._id,})
        if(student){
            res.status(200).json({
                success:true,
                student,
                events
            })
        }else{
            return res.status(404).json({
                success: false,
                message: "No One student register events"
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





//faculty get registred stdentns by search method
router.get('/search/:facultyId', async (req: Request, res: Response, next: NextFunction) => {
    const facultyId = req.params.facultyId;
    try {
        const events = await Event.findOne({ faculty: facultyId }); // Use findOne to find a single event
        console.log(events);

        if (!events) {
            return res.status(400).json({
                success: false,
                message: "No event found with this ID"
            });
        }

        const registeredStudents = await Registerevent.find({ event: events._id });
        const username = req.query.username as string;
        console.log(registeredStudents)
        const users = registeredStudents.filter((item: any) => {
            return new RegExp(username, 'i').test(item.name);
        });

        if (users.length > 0) {
            res.status(200).json({
                success: true,
                students: users,
                events: events
            });
        } else {
            return res.status(404).json({
                success: false,
                message: "No student registered for the events with the provided username"
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





//get the student applications
router.get('/students/:facultyId/:eventId', async (req: Request, res: Response, next: NextFunction) => {
    const { facultyId, eventId } = req.params;
    try {
        const event = await Event.findOne({ _id: eventId, faculty: facultyId }); // Use findOne to find a single event
        console.log(event);

        if (!event) {
            return res.status(400).json({
                success: false,
                message: "No event found with this ID"
            });
        }

        const students = await Registerevent.find({event:eventId});
        if(students){
            res.status(200).json({
                success:true,
                students
            })
        }else{
            return res.status(404).json({
                success: false,
                message: "No One student register events"
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



//get the feed back from the register student
// router.get('/feedbacks/:facultyId',async(req:Request,res:Response,next:NextFunction)=>{
//      const {facultyId} = req.params;
//     try{
//        const facultys = await Event.find({faculty:facultyId});
//        if(!facultys){
//         res.status(400).json({
//             success:false,
//             message:"faculty not posted"
//         })
//        }
//        console.log(facultys)
//        const id = await facultys.map((item:any)=>{
//         return item._id
//        });
//        console.log(id);
//        const feedbacks = await Feedback.find({event:id});
//        console.log(feedbacks);
//        const eventid =  feedbacks.map((item:any)=>{
//         return item._id
//        });
//         const eventss =  await Event.findById(eventid)
//        if(feedbacks){
//         res.status(200).json({
//             success:true,
//             feedbacks:feedbacks,
//             event:eventss
//         })
//        }else{
//         res.status(404).json({
//             success:false,
//             message:"no feed backs"
//         })

//        }

//     }catch(error){
//         console.log(error)
//         res.status(500).json({
//             success:false,
//             message:"internal server error"
//         })
//     }
// })


router.get('/feedbacks/:facultyId', async (req: Request, res: Response, next: NextFunction) => {
    const { facultyId } = req.params;
    try {
        const events = await Event.find({ faculty: facultyId });
        if (events.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No events found for the specified faculty"
            });
        }
        const eventIds = events.map((event: any) => event._id);
        const feedbacks = await Feedback.find({ event: { $in: eventIds } });
        if (feedbacks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No feedbacks found for the specified faculty"
            });
        }
        res.status(200).json({
            success: true,
            feedbacks: feedbacks,
            events: events.map((item:any)=>item.title)
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});



//post the quires
router.post('/quires/:facultyId', async (req: Request, res: Response, next: NextFunction) => {
    const facultyId = req.params.facultyId;
    try {
        const student = await faculty.findById(facultyId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "No student found with this ID"
            });
        }
        const { text, username, email } = req.body;
    
        // Get the current date in IST
        const currentDate = new Date();
        const ISTOffset = 5.5 * 60 * 60 * 1000; // Offset for IST in milliseconds
        const ISTDate = new Date(currentDate.getTime() + ISTOffset);

        console.log("IST Date:", ISTDate); // Log the IST date

        const newone = await Problems.create({
            faculty: facultyId,
            text,
            username,
            email,
            date: ISTDate
        });
        
        if (newone) {
            res.status(200).json({
                success: true,
                newone
            });
        } else {
            res.status(404).json({
                success: false
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});







module.exports = router
