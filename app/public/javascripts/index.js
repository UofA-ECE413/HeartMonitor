$(function () {
    const token = window.localStorage.getItem('token');
    
    if (token) {
        $("nav").html(`
            <a href="dashboard.html">Dashboard</a>
            <a href="account.html">Account</a>
        `);
    } else {
        $("nav").html(`
            <a href="login.html">Login</a>
            <a href="signup.html">Sign Up</a>
        `);
    }
});
