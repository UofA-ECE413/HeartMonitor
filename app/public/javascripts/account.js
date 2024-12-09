// public/javascripts/account.js

// Register LogOut button and request user status
$(function (){
    $('#btnLogOut').click(logout);

    $.ajax({
        url: '/patients/status',
        method: 'GET',
        headers: { 'x-auth' : window.localStorage.getItem("token") },
        dataType: 'json'
    })
    .done(function (data) {
        $('#rxData').html(JSON.stringify(data, null, 2));
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        window.location.replace("login.html");
    });
});

// Remove token to logout
function logout() {
    localStorage.removeItem("token");
    window.location.replace("index.html");
}
