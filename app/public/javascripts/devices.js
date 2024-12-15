// Register all components of the add device form
$(addDeviceForm);

// Update devices on dashboard
$(getDevices);

// Open add device form and clear all fields
function openAddDevice() {
    const modal = $("#deviceFormModal");
    const formTitle = $("#form-title");
    formTitle.text("Add a New Device");
    $("#submitDevice").css("display", "block");
    $("#deleteDevice").css("display", "none");
    $("#updateDevice").css("display", "none");

    $("#deviceId").val("").prop("disabled", false); 
    $("#deviceName").val("");
    $("#frequency").val("30");
    $("#startTime").val("06:00");
    $("#endTime").val("22:00");

    modal.css("display", "flex");
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
        $('#devices').html(`<div class="device-header"><h2>Your Devices</h2><button id="addDeviceBtn" class="button" style="float:right;" onclick="openAddDevice()">&#43</button></div>`);
        data.devices.forEach((device) => {
            // $('#devices').append(`<tr><td>${device.name}</td><td><button id=${device.id} class="button" onclick="manageDeviceForm(this)">Manage Device</button></td></tr>`);
            // $('#deviceDropdown').append(`<option value=${device.name} id="${device.id}-dropdown">${device.name}</option>`);

            const $deviceItem = $("<div>").addClass("device-item");

            const $deviceNameDisplay = $("<span>")
                .addClass("device-name")
                .text(device.name);

            const $manageButton = $("<button>")
                .attr("id", device.id)
                .addClass("button")
                .text("Manage")
                .on("click", function () {manageDeviceForm(this)});

            $deviceItem.append($deviceNameDisplay).append($manageButton);

            $('#devices').append($deviceItem);
        });

        
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        window.location.replace("login.html");
    });
}

function addDeviceForm() {
    const modal = $("#deviceFormModal");
    const addDeviceBtn = $("#addDeviceBtn");
    const closeModal = $("#closeForm");
    const submitDevice = $("#submitDevice");

    closeModal.on("click", function () {
        modal.css("display", "none");
    });

    submitDevice.on("click", function () {
        const deviceName = $("#deviceName").val().trim();
        const deviceId = $("#deviceId").val().trim();
        const frequency = $("#frequency").val();
        const startTime = $("#startTime").val();
        const endTime = $("#endTime").val();

        const timeRange = startTime + "," + endTime;
        console.log(timeRange);

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
                    startTime: startTime,
                    endTime: endTime,
                }}),
                success: function (response) {
                    // alert("Device added successfully!");
                    getDevices();
                    modal.hide();
                    $("#deviceId").val(""); 
                },
                error: function (err) {
                    console.error("Error adding device:", err);
                    alert("Failed to add device. Please try again.");
                },
            });

            console.log(`https://api.particle.io/v1/devices/${deviceId}/frequency: ${frequency}`);

            $.ajax({
                url: `https://api.particle.io/v1/devices/${deviceId}/frequency`,
                crossDomain: true,
                method: 'post',
                headers: {
                  'Authorization': 'Bearer cc002dcb1b5b7200f638e7e8688c9ec99438b567'
                },
                contentType: 'application/x-www-form-urlencoded',
                data: {
                  'args': frequency
                }
              }).done(function(response) {
                console.log(response);
            });
            $.ajax({
                url: `https://api.particle.io/v1/devices/${deviceId}/setTimeRange`,
                crossDomain: true,
                method: 'post',
                headers: {
                  'Authorization': 'Bearer cc002dcb1b5b7200f638e7e8688c9ec99438b567'
                },
                contentType: 'application/x-www-form-urlencoded',
                data: {
                  'args': $("#startTime").val() + "," + $("#endTime").val()
                }
              }).done(function(response) {
                console.log(response);
            });
        } 
    });

    $(window).on("click", function (e) {
        if ($(e.target).is(modal)) {
            modal.hide();
        }
    });
}

function manageDeviceForm(e) {
    const modal = $("#deviceFormModal");
    const closeModal = $("#closeForm");
    const formTitle = $("#form-title");

    formTitle.text("Manage Device");
    $("#submitDevice").css("display", "none");
    $("#deleteDevice").css("display", "block");
    $("#updateDevice").css("display", "block");

    const deviceID = e.id;

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
        $("#startTime").val(data.device.startTime);
        $("#endTime").val(data.device.endTime);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        alert("Error fetching device details");
    });

    modal.css("display", "flex");

    closeModal.on("click", function () {
        modal.css("display", "none");
        $("#deleteDevice").off("click");
        $("#updateDevice").off("click");
    });

    $('#deleteDevice').on("click", function () {
        $.ajax({
            url: `/patients/deleteDevice/${deviceID}`, 
            method: 'DELETE',
            headers: { 'x-auth': window.localStorage.getItem("token") },
            dataType: 'json'
        })
        .done(function (data) {
            // alert("Device deleted successfully.");
            getDevices();
            modal.hide();
            $("#deleteDevice").off("click");
            $("#updateDevice").off("click");
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
                startTime: $("#startTime").val(),
                endTime: $("#endTime").val(),
            }),
            success: function (response) {
                // alert("Device updated successfully!");
                getDevices();
                modal.hide();
                $("#deleteDevice").off("click");
                $("#updateDevice").off("click");
            },
            error: function (err) {
                console.error("Error updating device:", err);
                alert("Failed to update device. Please try again.");
            },
        });

        console.log(`https://api.particle.io/v1/devices/${deviceID}/frequency: ${$("#frequency").val()}`);
        
        $.ajax({
            url: `https://api.particle.io/v1/devices/${deviceID}/frequency`,
            crossDomain: true,
            method: 'post',
            headers: {
              'Authorization': 'Bearer cc002dcb1b5b7200f638e7e8688c9ec99438b567'
            },
            contentType: 'application/x-www-form-urlencoded',
            data: {
              'args': $("#frequency").val()
            }
          }).done(function(response) {
            console.log(response);
        });

        $.ajax({
            url: `https://api.particle.io/v1/devices/${deviceID}/setTimeRange`,
            crossDomain: true,
            method: 'post',
            headers: {
              'Authorization': 'Bearer cc002dcb1b5b7200f638e7e8688c9ec99438b567'
            },
            contentType: 'application/x-www-form-urlencoded',
            data: {
              'args': $("#startTime").val() + "," + $("#endTime").val()
            }
          }).done(function(response) {
            console.log(response);
        });
    })

    $(window).on("click", function (e) {
        if ($(e.target).is(modal)) {
            modal.hide();
            $("#deleteDevice").off("click");
            $("#updateDevice").off("click");
        }
    });
}