const fs = require('fs');

// Function to generate the booking JSON based on the current month and year
function generateBookingJson() {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();
  
  const blocks = ['Raman', 'KC', 'Ramanujan', 'Aryabhatta', 'Bhabha'];

  // Function to create a blank booking for a day
  const createEmptyBooking = () => ({
    "08:30 - 01:30": { "booked_by": null, "purpose": null },
    "01:30 - 06:00": { "booked_by": null, "purpose": null }
  });

  // Function to generate the bookings for a seminar hall or auditorium
  const generateBookings = (seminarCount) => {
    return Array.from({ length: seminarCount }, (_, i) => ({
      bookings: Array.from({ length: daysInMonth }, (_, dayIndex) => ({
        date: `${currentYear}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${(dayIndex + 1).toString().padStart(2, '0')}`,
        ...createEmptyBooking() // Creating empty bookings for each date
      }))
    }));
  };

  // Generate the JSON structure
  const bookingJson = {};
  
  blocks.forEach(block => {
    const blockJson = {
      "month": currentMonth,
      "year": currentYear,
    };
    if (block === "Raman") {
      blockJson.seminar1 = generateBookings(1);
      blockJson.seminar2 = generateBookings(1);
      blockJson.auditorium = generateBookings(1); // Adding auditorium to Raman
    } else {
      blockJson.seminar1 = generateBookings(1);
      blockJson.seminar2 = generateBookings(1);
    }
    bookingJson[block] = blockJson;
  });

  return bookingJson;
}

// Save the generated JSON to a file
const bookingData = generateBookingJson();
fs.writeFileSync('SA.json', JSON.stringify(bookingData, null, 2), 'utf8');
console.log('Booking JSON created successfully.');
