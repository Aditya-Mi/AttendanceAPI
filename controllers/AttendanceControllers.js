const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const APIFeatures = require('../utils/apiFeatures');
const tryCatch = require('../utils/tryCatch');
const AppError = require('../utils/AppError');
// Utility for async/await error handling

// Get all attendance records
// Get all attendance records
exports.getAllAttendanceRecords = tryCatch(async (req, res, next) => {
    // Initialize the query with the AttendanceRecord model
    let query = AttendanceRecord.find();

    // Initialize APIFeatures with the query and query string
    const features = new APIFeatures(query, req.query)
        .filter()
        .sorting()
        .limitFields()
        .pagination();

    // Execute the query
    const attendanceRecords = await features.query;

    res.status(200).json({
        status: 'success',
        results: attendanceRecords.length,
        data: {
            attendanceRecords
        }
    });
});


// Get attendance records for a specific user
exports.getUserAttendanceRecords = tryCatch(async (req, res, next) => {
    const userId = req.params.userId;

    // Initialize the query with the AttendanceRecord model and filter by user ID
    let query = AttendanceRecord.find({ student: userId });

    // Initialize APIFeatures with the query and query string
    const features = new APIFeatures(query, req.query)
        .filter()
        .sorting()
        .limitFields()
        .pagination();

    // Execute the query
    const attendanceRecords = await features.query;

    res.status(200).json({
        status: 'success',
        results: attendanceRecords.length,
        data: {
            attendanceRecords
        }
    });
});


// Get attendance records for a specific teacher's class
exports.getTeacherClassAttendanceRecords = tryCatch(async (req, res, next) => {
    const classId = req.params.classId;

    // Initialize the query with the AttendanceRecord model and filter by class ID
    let query = AttendanceRecord.find({ class: classId }).populate('student');

    // Initialize APIFeatures with the query and query string
    const features = new APIFeatures(query, req.query)
        .filter()
        .sorting()
        .limitFields()
        .pagination();

    // Execute the query
    const attendanceRecords = await features.query;

    res.status(200).json({
        status: 'success',
        results: attendanceRecords.length,
        data: {
            attendanceRecords
        }
    });
});


// Create an attendance record
exports.createAttendanceRecord = tryCatch(async (req, res, next) => {
    const attendanceData = req.body; // Assuming attendanceData is an array of attendance records

    try {
        const updatedAttendanceRecords = [];

        for (const record of attendanceData) {
            // Extract the date without considering time
            const date = new Date(record.date);
            const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);

            // Check if an attendance record already exists for the student, class, and date (ignoring time)
            const existingRecord = await AttendanceRecord.findOne({
                student: record.student,
                class: record.class,
                date: { $gte: startDate, $lt: endDate } // Match date only, ignore time
            });

            if (existingRecord) {
                // If an attendance record already exists, update it
                existingRecord.status = record.status;
                existingRecord.reason = record.reason;
                existingRecord.remarks = record.remarks;
                await existingRecord.save();
                updatedAttendanceRecords.push(existingRecord);
            } else {
                // If no attendance record exists, create a new one
                const newAttendanceRecord = await AttendanceRecord.create(record);
                updatedAttendanceRecords.push(newAttendanceRecord);
            }
        }

        res.status(201).json({
            status: 'success',
            data: {
                attendanceRecords: updatedAttendanceRecords
            }
        });
    } catch (err) {
        console.error(err);
        return next(new AppError('Failed to create/update attendance records', 500));
    }
});


// Update an attendance record
exports.updateAttendanceRecord = tryCatch(async (req, res, next) => {
    const attendanceRecordId = req.params.id;
    const updatedAttendanceRecord = await AttendanceRecord.findByIdAndUpdate(attendanceRecordId, req.body, {
        new: true,
        runValidators: true
    });

    if (!updatedAttendanceRecord) {
        return next(new AppError('No attendance record found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            attendanceRecord: updatedAttendanceRecord
        }
    });
});

// Delete an attendance record
exports.deleteAttendanceRecord = tryCatch(async (req, res, next) => {
    const attendanceRecordId = req.params.id;
    const deletedAttendanceRecord = await AttendanceRecord.findByIdAndDelete(attendanceRecordId);

    if (!deletedAttendanceRecord) {
        return next(new AppError('No attendance record found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});
