$(getDeviceData);

function getDeviceData() {
    $.ajax({
        url: '/readings/getData?deviceID=e00fce6884202fbdd742846c',
        method: 'GET',
        dataType: 'json'
    })
    .done(function (data) {
        $('#readings').html(JSON.stringify(data, null, 2));
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        window.location.replace("login.html");
    });
}