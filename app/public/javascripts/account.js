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

    $('#changePassBtn').on("click", function (event) {
        event.preventDefault(); // Prevent form submission
        changePassword();
    });
    
});

// Remove token to logout
function logout() {
    localStorage.removeItem("token");
    window.location.replace("index.html");
}

// Validate new password and call /patients/changePassword
function changePassword() {
    var password = $('#old_password').val();
    var newPassword = $('#new_password').val();
    var confirmPassword = $('#confirm_new_password').val();

    if (newPassword !== confirmPassword) {
        $('#errorMsg').html('Passwords do not match');
        return;
    }

    if (newPassword === "" || !validatePassword(newPassword)) {
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
        oldPassword: password,
        newPassword: newPassword
    };

    $.ajax({
        url: '/patients/changePassword',
        method: 'POST',
        headers: { 'x-auth' : window.localStorage.getItem("token") },
        contentType: 'application/json',
        data: JSON.stringify(txdata),
        dataType: 'json'
    })
    .done(function (data) {
        $('#errorMsg').html(data.message);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        $('#errorMsg').html('Password change failed');
    });
}

// Regex to validate password
function validatePassword(password) {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    return passwordPattern.test(password);
}