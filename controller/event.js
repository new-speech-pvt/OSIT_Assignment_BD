import Events from "../models/event.js";

// Create Event
const createEvent = async (req, res) => {
  try {
    const { name, startDate, endDate, submissionExpiry, location } = req.body;

    // Basic field validation
    if (!name || !startDate || !endDate || !submissionExpiry || !location) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (name, startdate, enddate, submissionexpirydate, location)",
      });
    }

    // Date validations
    const start = new Date(startDate);
    const end = new Date(endDate);
    const expiry = Number(submissionExpiry);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after End date",
      });
    }

    // Create event
    const newEvent = await Events.create({
      name,
      startDate,
      endDate,
      submissionExpiry,
      location,
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: newEvent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All Events
const getAllEvents = async (req, res) => {
  try {
    const events = await Events.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Event by ID
const getEventById = async (req, res) => {
  try {
    const event = await Events.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Event
const updateEvent = async (req, res) => {
  try {
    const { name, startDate, endDate, submissionExpiry, location } = req.body;

    // Basic validation
    if (!name || !startDate || !endDate || !submissionExpiry || !location) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const expiry = Number(submissionExpiry);

    if (start > end) {
      return res.status(400).json({ success: false, message: "Start date cannot be after End date" });
    }

    const updatedEvent = await Events.findByIdAndUpdate(
      req.params.id,
      { name, startDate, endDate, submissionExpiry, location },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    res.status(200).json({ success: true, message: "Event updated", data: updatedEvent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Event
const deleteEvent = async (req, res) => {
  try {
    const event = await Events.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export{createEvent,getAllEvents,getEventById,updateEvent,deleteEvent};