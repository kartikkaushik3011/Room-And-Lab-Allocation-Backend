const xlsx = require('xlsx');
const fs = require('fs');
const workbook = xlsx.readFile('KCRoomsData.xlsx');
const sheet_name = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheet_name];
const jsonData = xlsx.utils.sheet_to_json(worksheet);

function generateSlot(subject, teacher) {
    const isAvailable = !subject && !teacher;

    return {
        status: isAvailable ? "available" : "occupied",
        subject: subject || "N/A",
        teacher: teacher || "N/A"
    };
}
let finalStructure = {};

jsonData.forEach(row => {
    const building = row['Building'];
    const room_no = row['Room no.'];
    const day = row['Day'];

    if (!finalStructure[building]) {
        finalStructure[building] = { rooms: [], labs: [] };
    }
    const roomSlots = {
        "08:50 - 09:40": generateSlot(row['Subject 1'], row['Teacher 1']),
        "09:40 - 10:30": generateSlot(row['Subject 2'], row['Teacher 2']),
        "10:40 - 11:30": generateSlot(row['Subject 3'], row['Teacher 3']),
        "11:30 - 12:20": generateSlot(row['Subject 4'], row['Teacher 4']),
        "12:20 - 01:10": generateSlot(row['Subject 5'], row['Teacher 5']),
        "02:00 - 02:50": generateSlot(row['Subject 7'], row['Teacher 7']),
        "02:50 - 03:40": generateSlot(row['Subject 8'], row['Teacher 8']),
        "03:40 - 04:30": generateSlot(row['Subject 9'], row['Teacher 9'])
    };
    let roomType = room_no.startsWith('LAB') ? 'labs' : 'rooms';
    let existingRoom = finalStructure[building][roomType].find(r => r.room_no === room_no);

    if (!existingRoom) {
        existingRoom = {
            room_no: room_no,
            days: []
        };
        finalStructure[building][roomType].push(existingRoom);
    }
    existingRoom.days.push({
        day: day,
        slots: roomSlots
    });
});
fs.writeFileSync('KC.json', JSON.stringify(finalStructure, null, 2));

console.log('Excel data has been converted to custom JSON with days, subjects, and teachers and saved as KC.json.');
