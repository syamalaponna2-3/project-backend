import { Router, query } from "express";
const router = Router();
const user = require('../models/auth');
import Problems from "../models/Problems";
const nodemailer = require('nodemailer');
import Event from '../models/Event'
import { Request, Response, NextFunction } from "express";
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Registerevent from "../models/Registerevent";
import { Query } from "mongoose";
const Feedback = require('../models/Feedback');
const{validate,Studentlogin,Studentregister} = require('../validations/studentvalidation');






//SECTION -A STUDENT CRUD OPERATION



// Generate a random 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendVerificationEmail = async (email: any, otp: any) => {
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
    destination: 'students',
    filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const uploads = multer({ storage: storages });





type registertype = {
    email: String,
    password: String,
    mobileNumber: String
    name: String

}



router.post('/registerUser', uploads.fields([{ name: 'Avatar', maxCount: 1 }]), async (req: any, res: Response, next: NextFunction) => {
    const { email, password, mobileNumber, name } = req.body;

    try {
        // Check if the email is already registered and verified
        const existingUser = await user.findOne({ email });

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

            return res.status(200).json({ success: false, message: 'Email already registered but not verified. Resent verification email with a new code.' });
        }


        // Generate and store verification code
        const verificationCode = generateOTP();

        if (!req.files || !req.files['Avatar'] || !req.files['Avatar'][0]) {
            return res.status(400).json({
                success: false,
                message: "Avatar file is missing",
            });
        }

        // Save user to the database
        const newUser = new user({
            email,
            password,
            mobileNumber,
            name,
            verificationCode,
            Avatar: req.files['Avatar'][0].filename
        });

        await newUser.save() as registertype[];

        // Send verification email
        await sendVerificationEmail(email, verificationCode);

        res.status(201).json({ success: true, message: 'User registered successfully. Check your email for verification.',newUser:newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});






//verify the otp

type verify = {
    otp: Number
}




router.post('/verify/:userId', async (req: Request, res: Response, next: NextFunction) => {
    const userId : string = req.params.userId;
    const { otp } = req.body; 

    try {
        // Find user by userId
        const student = await user.findById(userId);

        if (!student) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if the OTP matches
        if (student.verificationCode === otp) { // Ensure types and values match
            
            // Update user as verified
            student.isVerified = true;
            await student.save();
        
            return res.status(200).json({ success: true, message: 'Email verified successfully' });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid verification code' });
        }
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});




type Login = {
    email: string;
    password: string;
    isVerified?: boolean;
};

// Login the user
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    try {
        const userFound = await user.findOne({ email: email, password: password }) as Login;

        if (!userFound) {
            return res.status(404).json({
                success: false,
                message: "No user found with this email and password"
            });
        } else if (userFound.isVerified === false) {
            return res.status(404).json({
                success: false,
                message: "User not verified"
            });
        } else {
            return res.status(200).json({
                success: true,
                userFound,
                message: "Successful Login"
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

//forgot password
router.put('/forgot/:userid', async(req:Request,res:Response, next:NextFunction) =>{
    const userid = req.params.userid;
    try{
        const student = await user.findById(userid);
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
        const update = await user.findByIdAndUpdate(userid,{password:newpassword})
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

//get student details
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


//student update their details
router.put('/student/:studentId', uploads.fields([{ name: 'Avatar', maxCount: 1 }]), async (req: any, res: any, next: NextFunction) => {
    const studentId = req.params.studentId;
    try {
        const existingUser = await user.findById(studentId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const { email, mobileNumber, name } = req.body;

        const updatedImage = req.files['Avatar'] ? req.files['Avatar'][0].filename : existingUser.Avatar;

        // Update the user's information

        const updatedUser = await user.findByIdAndUpdate(studentId,{
            email, mobileNumber, name,
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

//student delete their account
router.delete('/student/:studentId', async (req: Request, res: Response, next: NextFunction) => {
    const studentId = req.params;
    try {
        const users = await user.findById(studentId) as registertype;
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



//SECTION-B 
// student get the events
router.get('/event/:studentId', async (req: any, res: Response, next: NextFunction) => {
    const studentId = req.params.studentId;

    try {
        // Find the student by ID
        const student = await user.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

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




//get gy filter

//get particular event detils
router.get('/event/:studentId/:eventId',async(req:Request,res:Response,next:NextFunction)=>{
    const {studentId,eventId} = req.params;
    try{
        const student = await user.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const event = await Event.findById(eventId)
        if(!event){
            return res.status(404).json({
                success: false,
                message: "event not found"
            });
        }else{
            return res.status(200).json({
                success: true,
                event
            });

        }
        
    }catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }


})


router.get('/events/:studentId', async (req: Request, res: Response, next: NextFunction) => {
    const studentId = req.params.studentId;
    try {
        const student = await user.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const { title } = req.query; // Changed req.body to req.query for retrieving title from query parameters
        const events = await Event.find({ title: { $regex: title, $options: 'i' } }); // Corrected regex syntax and options

        if (events.length > 0) { // Check if any events found
            res.status(200).json({
                success: true,
                events
            });
        } else {
            return res.status(404).json({ // Changed status code to 404 if no events found
                success: false,
                message: "No event found"
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







type register = {
    name: String,
    email: String,
    mobileNumber: number,
    collegename: String,
    roll_number: String,
    amount?:number





}


function generateRandomTicket() {
    const prefix = "TCKNO";
    const randomDigits = Math.floor(Math.random() * 10000);
    const ticket = `${prefix}${randomDigits}`;
    return ticket;
}

const sendTicketEmail = async (email: any, Ticket: any) => {
    // Use nodemailer or any other email sending service to send the OTP to the user's email
    // Example using nodemailer
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: '', //your email address
            pass: '' // your app password
        },
        connectionTimeout: 10000, // 10 seconds
        timeout: 10000, // 10 seconds
        secure: true
    });

    const mailOptions = {
        from: '',  //your email address
        to: email,
        subject: 'Email Verification',
        text: `Your are register your ticketis: ${Ticket}`,
    };

    await transporter.sendMail(mailOptions);
};


//student register the events
router.post('/event/:studentId/:eventId', async (req: Request, res: Response, next: NextFunction) => {
    const { studentId, eventId } = req.params;

    try {
        // Find the user by studentId
        const userDoc = await user.findById(studentId) as registertype;
        if (!userDoc) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const student = userDoc;

        // Find the event by eventId
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found"
            });
        }

        // Check if the student is already registered for the event
        const alreadyRegistered = await Registerevent.findOne({ student: studentId, event: eventId });
        if (alreadyRegistered) {
            return res.status(400).json({
                success: false,
                message: "Student already registered for the event"
            });
        }

        const { name, email, mobileNumber, collegename, department, roll_number,section } = req.body;

        // Check if the event has an associated amount (price)

        // Create a registration record for the student with the payment record
        const registered = await Registerevent.create({
            student: studentId,
            event: eventId,
            name,
            email,
            mobileNumber,
            collegename,
            department,
            roll_number,
            section
        });

        if (registered) {
             //const ticket = generateRandomTicket();
            
            // Send the ticket to the student's email
             //await sendTicketEmail(student.email, ticket);
            // Decrease event strength by 1
            await Event.findByIdAndUpdate(eventId, { $inc: { strength: -1 } });
            await Event.findByIdAndUpdate(eventId, { $inc: { registered: +1 } });

            return res.status(200).json({
                success: true,
                message: "Student registered for the event"
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Error registering student for the event"
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




//get the student register event


router.get('/registerevent/:studentId',async (req: Request, res: Response, next: NextFunction) => {
    const studentId = req.params.studentId;
    try {
        const users = await user.findById(studentId) as registertype;
        if (!users) {
            res.status(404).json({
                success: false,
                message: "no user not found"
            })
        }
        const events = await Registerevent.find({ student: studentId });
        console.log(events)
        const eventid = await events.map((item:any)=>{
            return item.event
        })
        console.log(eventid)
        const upcome = await Event.find({_id:eventid})
        console.log(upcome)
        const currentDate = new Date()
        const registerd = await upcome.filter((item:any)=>{
            return item.to_date > currentDate
        })
        console.log(registerd)
        if (registerd) {
            res.status(200).json({
                success: true,
                registerd
            })

        } else {
            res.status(400).json({
                success: false,
                message: "some went wroung try afer some time"
            })
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "internal server error"
        })
    }

})





//student get the history

router.get('/history/:studentId', async (req: Request, res: Response, next: NextFunction) => {
    const studentId = req.params.studentId;
    try {
        const student = await user.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "No student found with this ID"
            });
        }

        const currentDate = new Date();
        
        // Get events for the student with a to_date before the current date
        const registeredEvents = await Registerevent.find({ student: studentId });
        const eventIds = registeredEvents.map((item: any) => item.event);
        const events = await Event.find({ _id: { $in: eventIds } });
        
        const filteredEvents = events.filter((event: any) => event.to_date < currentDate);
        
        // Group events by month
        const eventsByMonth: { [key: string]: any[] } = {};
        filteredEvents.forEach((event: any) => {
            const monthYear = `${event.to_date.getMonth() + 1}-${event.to_date.getFullYear()}`;
            if (!eventsByMonth[monthYear]) {
                eventsByMonth[monthYear] = [];
            }
            eventsByMonth[monthYear].push(event);
        });

        res.status(200).json({
            success: true,
            events: eventsByMonth
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
 




//feedback by the students


router.post('/feedback/:studentId/:eventId', async (req: Request, res: Response, next: NextFunction) => {
    const { studentId, eventId } = req.params;
    try {
        // Check if the event is registered
        const registeredEvent = await Registerevent.findOne({ student: studentId, event: eventId });
        if (!registeredEvent) {
            return res.status(404).json({
                success: false,
                message: "Event not registered"
            });
        }

        // Check if the feedback is already submitted for this event by the student
        const checkfeedback = await Feedback.find({ user: studentId, event: eventId });
        if (checkfeedback.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Feedback already submitted"
            });
        }

        const currentDate = new Date();
        const ISTOffset = 5.5 * 60 * 60 * 1000; // Offset for IST in milliseconds
        const ISTDate = new Date(currentDate.getTime() + ISTOffset);

        // Extract feedback details from the request body
        const { feedback, username, email } = req.body;

        // Save the feedback with the current Indian date
        const feedbackDoc = await Feedback.create({
            user: studentId,
            event: eventId,
            feedback,
            username,
            email,
            date: ISTDate // Save the current Indian date
        });

        // Respond with success message
        res.status(201).json({
            success: true,
            message: "Feedback submitted successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});






// Queries for student

router.post('/quires/:studentId', async (req: Request, res: Response, next: NextFunction) => {
    const studentId = req.params.studentId;
    try {
        const student = await user.findById(studentId);
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
            student: studentId,
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










router.get('/filterevent', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { year, department, amount, others, clubs } = req.query as { year?: string; department?: string; amount?: string; others?: string; clubs?: string };
        let query:any = {};

        if (year) {
            query.year = year;
        }
        if (department) {
            query.department = department;
        }
        if (others) {
            query.others = others;
        }
        if (clubs) {
            query.clubs = clubs;
        }
        if (amount) {
            const [priceMin, priceMax] = amount.split('-').map((p:any) => parseInt(p.trim()));

            if (!isNaN(priceMin)) {
                query.price = { $gte: priceMin };
            }
            if (!isNaN(priceMax)) {
                query.price = { ...query.price, $lte: priceMax };
            }
        }

        const events = await Event.find(query);

        res.status(200).json({
            success: true,
            data: events
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});






module.exports = router
