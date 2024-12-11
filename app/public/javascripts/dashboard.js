
// Register all components of the add device form
$(addDeviceForm);

// Update devices on dashboard
$(getDevices);

// Set first/default option to "Select device" (disabled), register change listener
$(document).ready(function () {
    $('#deviceDropdown').append('<option value="" disabled selected>Select device</option>');
    let deviceID;

    $('#deviceDropdown').on('change', function () {
        deviceID = $(this).find(':selected').attr('id').split("-")[0];
        const date = $("#graphDay").val();
        getDeviceData(deviceID, date);
    });

    $('#graphDay').on('change', function() {
        const date = $("#graphDay").val();
        getDeviceData(deviceID, date);
    });

    $("#deviceFormModal").validate();
});

// JQuery ajax call to getData endpoint, update dashboard with data from readings database
function getDeviceData(deviceID, date) {
    $.ajax({
        url: `/readings/getData/${deviceID}`,
        method: 'GET',
        headers: { 'x-auth' : window.localStorage.getItem("token") },
        dataType: 'json'
    })
    .done(function (data) {
        // For daily results
        let heartRates = [];
        let spo2s = [];
        let times = [];

        // For weekly summary
        weeklyHeart = [];
        weeklySpo2 = [];
        const weeklyDate = new Date(); 
        weeklyDate.setDate(weeklyDate.getDate() - 7);
        
        // For Table
        $('#readings').html(`<tr><th>Time</th><th>Heart Rate</th><th>spO2</th></tr>`);

        // For Charts
        if (date == "") {
            date = new Date();
            date = date.toISOString();
        }
        
        data.forEach((entry) => {
            // For Table
            let readingDate = new Date(entry.time);
            const entryDate = readingDate.toLocaleString();

            // get data for chart
            if (compareDates(entryDate, date)) {
                $('#readings').append(`<tr><td>${entryDate}</td><td>${entry.heartRate}</td><td>${entry.spo2}</td></tr>`);
                heartRates.push(entry.heartRate);
                spo2s.push(entry.spo2);
                times.push(getFormattedTime(readingDate));
            }

            // get data for weekly summary
            if (readingDate > weeklyDate) {
                weeklyHeart.push(entry.heartRate);
                weeklySpo2.push(entry.spo2);
            }
        });

        // Update charts
        updateHeartChart(times, heartRates);
        updateSpo2Chart(times, spo2s);
        loadWeeklySummary(weeklyHeart, weeklySpo2);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        window.location.replace("login.html");
    });
}


// JQuery ajax call to devices endpoint, add devices to dashboard device list and dropdown menu
function getDevices() {
    $.ajax({
        url: '/patients/devices',
        method: 'GET',
        headers: { 'x-auth' : window.localStorage.getItem("token") },
        dataType: 'json'
    })
    .done(function (data) {
        data.devices.forEach((device) => {
            $('#devices').append(`<p>${device.name}</p><button id=${device.id} class="button" onclick="manageDeviceForm(this)">Manage Device</button>`);
            $('#deviceDropdown').append(`<option value=${device.name} id="${device.id}-dropdown">${device.name}</option>`);
        });
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        window.location.replace("login.html");
    });
}

// Register components of add device form
function addDeviceForm() {
    // Modal functionality
    const modal = $("#deviceFormModal");
    const addDeviceBtn = $("#addDeviceBtn");
    const closeModal = $("#closeForm");
    const submitDevice = $("#submitDevice");
    const formTitle = $("#form-title");

    // Open the modal
    addDeviceBtn.on("click", function () {
        formTitle.text("Add a New Device");
        $("#submitDevice").css("display", "block");
        $("#deleteDevice").css("display", "none");
        $("#updateDevice").css("display", "none");

        $("#deviceId").val("").prop("disabled", false); 
        $("#deviceName").val("");
        $("#frequency").val("30");

        modal.css("display", "flex");
    });

    // Close the modal
    closeModal.on("click", function () {
        modal.css("display", "none");
    });

    // Add Device 
    submitDevice.on("click", function () {
        const deviceName = $("#deviceName").val().trim();
        const deviceId = $("#deviceId").val().trim();
        const frequency = $("#frequency").val();

        if ($("#deviceForm").valid()) {
            $.ajax({
                url: "/patients/addDevice",
                method: "POST",
                contentType: "application/json",
                headers: { 'x-auth' : window.localStorage.getItem("token") },
                data: JSON.stringify({ device: {
                    name: deviceName,
                    id: deviceId,
                    frequency: frequency,
                }}),
                success: function (response) {
                    alert("Device added successfully!");
                    getDevices();
                    modal.hide();
                    $("#deviceId").val(""); 
                },
                error: function (err) {
                    console.error("Error adding device:", err);
                    alert("Failed to add device. Please try again.");
                },
            });
        } 
        // else {
        //     alert("Please enter a valid Device ID.");
        // }
    });

    // Close modal on outside click
    $(window).on("click", function (e) {
        if ($(e.target).is(modal)) {
            modal.hide();
        }
    });
}

// Register components of add device form
function manageDeviceForm(e) {
    // Modal functionality
    console.log("MADE IT");
    const modal = $("#deviceFormModal");
    const closeModal = $("#closeForm");
    const formTitle = $("#form-title");

    formTitle.text("Manage Device");
    $("#submitDevice").css("display", "none");
    $("#deleteDevice").css("display", "block");
    $("#updateDevice").css("display", "block");

    let deviceID = e.id.split("-")[0];

    $.ajax({
        url: `/patients/deviceInfo/${deviceID}`,
        method: 'GET',
        headers: { 'x-auth' : window.localStorage.getItem("token") },
        dataType: 'json'
    })
    .done(function (data) {
        $("#deviceName").val(data.device.name);
        $("#deviceId").val(data.device.id).prop("disabled", true);
        $("#frequency").val(data.device.frequency);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        alert("Error fetching device details");
    });

    modal.css("display", "flex");

    // Close the modal
    closeModal.on("click", function () {
        modal.css("display", "none");
    });

    $('#deleteDevice').on("click", function () {
        $.ajax({
            url: `/patients/deleteDevice/${deviceID}`, 
            method: 'DELETE',
            headers: { 'x-auth': window.localStorage.getItem("token") },
            dataType: 'json'
        })
        .done(function (data) {
            alert("Device deleted successfully.");
            location.reload();
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.status === 401) {
                alert("Unauthorized access. Redirecting to login.");
                window.location.replace("login.html");
            } else if (jqXHR.status === 404) {
                alert("Device or patient not found.");
            } else {
                alert("An error occurred. Please try again.");
            }
        });
    })

    $("#updateDevice").on("click", function() {
        $.ajax({
            url: `/patients/updateDevice/${deviceID}`,
            method: "POST",
            contentType: "application/json",
            headers: { 'x-auth' : window.localStorage.getItem("token") },
            data: JSON.stringify({ 
                name: $("#deviceName").val(),
                frequency: Number($("#frequency").val()),
            }),
            success: function (response) {
                alert("Device updated successfully!");
                location.reload();
                modal.hide();
            },
            error: function (err) {
                console.error("Error updating device:", err);
                alert("Failed to update device. Please try again.");
            },
        });
    })

    

    // Close modal on outside click
    $(window).on("click", function (e) {
        if ($(e.target).is(modal)) {
            modal.hide();
        }
    });
}

function updateHeartChart(xlabels, heartRates) {
    // console.log(heartRates);
    const data = {
        labels: xlabels,
        datasets: [{
            type: 'line',
            label: 'Heart Rate',
            data: heartRates,
            borderColor: 'rgb(255, 99, 132)',
        }]
    };

    const config = {
        data: data,
        options: {
            responsive: false,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (hh:mm)' 
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Heart Rate (BPM)' 
                    }
                }
            }
        }
    };

    const ctx = document.getElementById('heartRateChart').getContext('2d');
    
    if (window[`myChart1`]) {
        window[`myChart1`].data = data; // Update the chart data
        window[`myChart1`].update(); // Re-render the chart
    } else {
        window[`myChart1`] = new Chart(ctx, config); // Create the chart if it doesn't exist
    }
}

function updateSpo2Chart(xlabels, spo2s) {
    const data = {
        labels: xlabels,
        datasets: [{
            type: 'line',
            label: 'Oxygen Saturation (Spo2)',
            data: spo2s,
            borderColor: 'rgb(132, 99, 255)',
        }]
    };

    const config = {
        data: data,
        options: {
            responsive: false,
            maintainAspectRatio: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (hh:mm)' 
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Oxygen Saturation %'
                    }
                }
            }
        }
    };

    const ctx = document.getElementById('spo2Chart').getContext('2d');
    if (window[`myChart2`]) {
        window[`myChart2`].data = data; // Update the chart data
        window[`myChart2`].update(); // Re-render the chart
    } else {
        window[`myChart2`] = new Chart(ctx, config); // Create the chart if it doesn't exist
    }
}

function getFormattedTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Pad single-digit hours and minutes with a leading zero
    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');

    return `${paddedHours}:${paddedMinutes}`;
}

function compareDates(  localDate, isoDate) {
    let arr = localDate.split(',')[0].split('/');
    const month1 = parseInt(arr[0]);
    const day1 = parseInt(arr[1]);
    const year1 = parseInt(arr[2]);

    arr = isoDate.split('T')[0].split('-');
    const year2 = parseInt(arr[0]);
    const month2 = parseInt(arr[1]);
    const day2 = parseInt(arr[2]);

    return (year1 == year2 && month1 == month2 && day1 == day2);
}

function loadWeeklySummary(heartRates, spo2s) {
    if (heartRates.length > 0) {
        let max = Math.max(...heartRates);
        let min = Math.min(...heartRates);
        let avg = heartRates.reduce((sum, num) => sum + parseInt(num), 0) / heartRates.length;
        $('#heartWeeklyAverage').text(avg.toFixed(1));
        $('#heartWeeklyMinimum').text(min);
        $('#heartWeeklyMaximum').text(max);
    } else {
        $('#heartWeeklyAverage').text('-');
        $('#heartWeeklyMinimum').text('-');
        $('#heartWeeklyMaximum').text('-');
    }
    if (spo2s.length > 0) {
        let max = Math.max(...spo2s);
        let min = Math.min(...spo2s);
        let avg = spo2s.reduce((sum, num) => sum + parseInt(num), 0) / spo2s.length;
        $('#spo2WeeklyAverage').text(avg.toFixed(1));
        $('#spo2WeeklyMinimum').text(min);
        $('#spo2WeeklyMaximum').text(max);
    } else {
        $('#spo2WeeklyAverage').text('-');
        $('#spo2WeeklyMinimum').text('-');
        $('#spo2WeeklyMaximum').text('-');
    }
}