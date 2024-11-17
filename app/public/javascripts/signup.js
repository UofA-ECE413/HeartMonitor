// public/javasciprts/signup.js

function validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

function validatePassword(password) {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    return passwordPattern.test(password);
}

function signup() {
    // data validation
    if ($('#email').val() === "" || !validateEmail($('#email').val())) {
        $('#errorMsg').text("Invalid email");
        return;
    }
    if ($('#password').val() === "" || !validatePassword($('#password').val())) {
        $('#errorMsg').html("<p>Invalid password. Password should have the following characteristics:</p>"
            + "<ul><li>At least 8 characters long</li>"
            + "<li>At least one lowercase letter</li>"
            + "<li>At least one uppercase letter</li>"
            + "<li>At least one digit</li>"
            + "<li>At least one special character</li>"
        );
        return;
    }
    let txdata = {
        email: $('#email').val(),
        password: $('#password').val()
    };
    $.ajax({
        url: '/patients/signUp',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(txdata),
        dataType: 'json'
    })
    .done(function (data, textStatus, jqXHR) {
        $('#rxData').html(JSON.stringify(data, null, 2));
        if (data.success) {
            // after 1 second, move to "login.html"
            setTimeout(function(){
                window.location = "login.html";
            }, 1000);
        }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        if (jqXHR.status == 404) {
            $('#rxData').html("Server could not be reached!!!");    
        }
        else $('#rxData').html(JSON.stringify(jqXHR, null, 2));
    });
}

$(function () {
    $('#btnSignUp').click(signup);
});