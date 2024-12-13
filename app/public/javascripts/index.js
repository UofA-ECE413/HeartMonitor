
// If patient is logged in, show dashboard and account in top nav. Otherwise show login and sign up. 
$(function () {
    const token = window.localStorage.getItem('token');
    
    if (token) {
        $("nav").html(`
            <a href="dashboard.html">Dashboard</a>
            <a href="devices.html">Devices</a>
            <a href="account.html">Account</a>
        `);
    } else {
        $("nav").html(`
            <a href="login.html">Login</a>
            <a href="signup.html">Sign Up</a>
        `);
    }
});
