$(getDeviceData);
$(addDeviceForm);
$(getDevices);

function getDeviceData() {
    $.ajax({
        url: '/readings/getData/e00fce6884202fbdd742846c',
        method: 'GET',
        headers: { 'x-auth' : window.localStorage.getItem("token") },
        dataType: 'json'
    })
    .done(function (data) {
        $('#readings').html(JSON.stringify(data, null, 2));
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        window.location.replace("login.html");
    });
}

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
        });
        // $('#devices').html(JSON.stringify(data, null, 2));
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        window.location.replace("login.html");
    });
}

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

    // Add Device Functionality
    submitDevice.on("click", function () {
        const deviceId = $("#deviceId").val().trim();

        if (deviceId) {
            // Example call to add device endpoint
            $.ajax({
                url: "/patients/addDevice",
                method: "POST",
                contentType: "application/json",
                headers: { 'x-auth' : window.localStorage.getItem("token") },
                data: JSON.stringify({ deviceIDs: [deviceId] }),
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
