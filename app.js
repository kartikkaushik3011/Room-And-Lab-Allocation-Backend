const express = require("express");
const app = express();
const path = require('path');
const fs = require('fs');
const sa = require("./SA.json")
const cors = require('cors');

const allowedOrigins = ['https://abesecroomandlaballocation.netlify.app'];
app.use(cors({ origin: allowedOrigins }));


const getBlockJson = (block_code) => {
    if (block_code === "ab") {
        return require('./AB.json');
    }
    if (block_code === "kc") {
        return require('./KC.json');
    }
    if (block_code === "bb") {
        return require('./BB.json');
    }
    if (block_code === "rj") {
        return require('./RJ.json');
    }
    if (block_code === "rm") {
        return require('./RM.json');
    }
    return null;
}

app.use(express.json());

app.get("/roomData/:block_code", (req, res) => {
    const block_code = req.params.block_code;
    const data = getBlockJson(block_code);

    if (data) {
        res.json(data);
    } else {
        res.status(404).send("Block not found");
    }
});
app.get("/seminarAudiData", (req, res) => {
    if (sa) {
        res.json(sa);
    } else {
        res.status(404).send("Block not found");
    }
})

app.post("/book/:place/:block_code/:room_no/:day/:slot", async (req, res) => {
    const { block_code, room_no, slot, place, day } = req.params;

    const data = getBlockJson(block_code);
    if (!data) {
        return res.status(404).send("Block not found");
    }

    const blocks = {
        "ab": "Aryabhatta",
        "kc": "KC",
        "bb": "Bhabha",
        "rm": "Raman",
        "rj": "Ramanujan"
    }

    const currBlock = blocks[block_code];
    const block = data[currBlock];
    const room = block[place].find(r => r.room_no == room_no);
    if (!room) {
        return res.status(404).send("Room not found");
    }

    const dayData = room.days.find(d => d.day === day);
    if (!dayData) {
        return res.status(404).send("Day not found");
    }

    const slotData = dayData.slots[slot];
    if (!slotData) {
        return res.status(404).send("Slot not found");
    }
    slotData.status = "Occupied";
    slotData.subject = req.body.subject_code;
    slotData.teacher = req.body.faculty_name;
    const filePath = path.join(__dirname, `${block_code.toUpperCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    res.status(200).json({
        message: "Room booked successfully",
        updatedRoomNo: room_no,
        block_code: block_code,
        day: day,
        slot: slot,
        subject: slotData.subject,
        teacher: slotData.teacher
    });
});
app.post("/bookSeminar/:block_code/:seminar/:date/:slot", (req, res) => {
    const { block_code, seminar, date, slot } = req.params;
    const { faculty_name, purpose } = req.body;

    const blocks = {
        "ab": "Aryabhatta",
        "kc": "KC",
        "bb": "Bhabha",
        "rm": "Raman",
        "rj": "Ramanujan"
    };

    const currBlock = blocks[block_code];
    if (!currBlock) {
        return res.status(404).send("Invalid block code.");
    }

    const sa = require("./SA.json");
    const seminarArray = sa[currBlock]?.[seminar];
    if (!Array.isArray(seminarArray) || seminarArray.length === 0) {
        return res.status(404).send("Seminar not found!");
    }

    const data = seminarArray[0];
    if (!data || !Array.isArray(data.bookings)) {
        return res.status(404).send("Bookings data not found!");
    }

    const seminarData = data.bookings.find(s => s.date === date);
    if (!seminarData) {
        return res.status(404).send("Date not found!");
    }

    const finalData = seminarData[slot];
    if (!finalData) {
        return res.status(404).send("Slot not found!");
    }
    finalData.booked_by = faculty_name;
    finalData.purpose = purpose;
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(__dirname, "SA.json");
    fs.writeFileSync(filePath, JSON.stringify(sa, null, 2), "utf8");

    res.status(200).json({
        message: `Venue booked successfully`,
        block_code,
        seminar,
        date,
        slot,
        purpose,
        faculty_name
    });
});

const apiUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';


app.listen(3000);
