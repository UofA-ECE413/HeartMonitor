$(getDeviceData);

function getDeviceData() {
    $.ajax({
        url: 'http://ec2-3-142-153-62.us-east-2.compute.amazonaws.com:3000/readings/getData?deviceID=e00fce6884202fbdd742846c',
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