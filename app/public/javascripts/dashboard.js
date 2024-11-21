
// Register all components of the add device form
$(addDeviceForm);

// Update devices on dashboard
$(getDevices);

// Set first/default option to "Select device" (disabled), register change listener
$(document).ready(function () {
    $('#deviceDropdown').append('<option value="" disabled selected>Select device</option>');

    $(document).on('change', '#deviceDropdown', function () {
        getDeviceData($(this).val());
    });
});

// JQuery ajax call to getData endpoint, update dashboard with data from readings database
function getDeviceData(deviceID) {
    $.ajax({
        url: `/readings/getData/${deviceID}`,
        method: 'GET',
        headers: { 'x-auth' : window.localStorage.getItem("token") },
        dataType: 'json'
    })
    .done(function (data) {
        $('#readings').html(`<tr><th>Time</th><th>Heart Rate</th><th>spO2</th></tr>`);
        data.forEach((entry) => {
            $('#readings').append(`<tr><td>${entry.time}</td><td>${entry.heartRate}</td><td>${entry.spo2}</td></tr>`);
        });
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
            $('#devices').append(device);
            $('#deviceDropdown').append(`<option value=${device}>${device}</option>`);
        });
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        window.location.replace("login.html");
    });
}

// Register components of add device form
function addDeviceForm() {
    // Modal functionality
    const modal = $("#addDeviceForm");
    const addDeviceBtn = $("#addDeviceBtn");
    const closeModal = $("#closeForm");
    const submitDevice = $("#submitDevice");

    // Open the modal
    addDeviceBtn.on("click", function () {
        modal.css("display", "flex");
    });

    // Close the modal
    closeModal.on("click", function () {
        modal.css("display", "none");
    });

    // Add Device 
    submitDevice.on("click", function () {
        const deviceId = $("#deviceId").val().trim();

        if (deviceId) {
            $.ajax({
                url: "/patients/addDevice",
                method: "POST",
                contentType: "application/json",
                headers: { 'x-auth' : window.localStorage.getItem("token") },
                data: JSON.stringify({ deviceID: deviceId }),
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
        } else {
            alert("Please enter a valid Device ID.");
        }
    });

    // Close modal on outside click
    $(window).on("click", function (e) {
        if ($(e.target).is(modal)) {
            modal.hide();
        }
    });
}
