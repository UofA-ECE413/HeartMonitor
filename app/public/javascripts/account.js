// public/javascripts/account.js
$(function (){
    $('#btnLogOut').click(logout);

    $.ajax({
        url: '/customers/status',
        method: 'GET',
        headers: { 'x-auth' : window.localStorage.getItem("token") },
        dataType: 'json'
    })
    .done(function (data, textStatus, jqXHR) {
        $('#rxData').html(JSON.stringify(data, null, 2));
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        window.location.replace("login.html");
    });
});

function logout() {
    localStorage.removeItem("token");
    window.location.replace("index.html");
}
