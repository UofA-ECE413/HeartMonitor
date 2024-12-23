// public/javascripts/login.js

// JQuery ajax call to login endpoint
function login() {
    let email = $('#email').val();
    let txdata = {
        email: email,
        password: $('#password').val()
    };
    $.ajax({
        url: '/patients/logIn',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(txdata),
        dataType: 'json'
    })
    .done(function (data, textStatus, jqXHR) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("email", email);
        window.location.replace("account.html");
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        $('#rxData').html(JSON.stringify(jqXHR, null, 2));
    });
}

// Register LogIn button
$(function () {
    $('#btnLogIn').click(login);
});