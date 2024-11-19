$(getDeviceData);

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