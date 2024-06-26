const { promisify } = require("util");
const User = require("./../models/User");
const tryCatch = require("../utils/tryCatch");
const jwt = require("jsonwebtoken");
const AppError = require("./../utils/AppError");

const signTocken = (id) => {
    return jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

exports.signup = tryCatch(async (req, res, next) => {
    const userInfo = ({ username, email, password, firstName, lastName, role } =
        req.body);
    if (role === "Admin") {
        return next(new AppError("You are not authorized to set this role", 401));
    }
    const newUser = await User.create(userInfo);
    const token = signTocken(newUser._id);

    // status 201 is for succesfully created
    res.status(201).json({
        status: "success",
        token,
        data: {
            user: {
                id: newUser._id,
                name: newUser.username,
                email: newUser.email,

            },
        },
    });
});

exports.login = tryCatch(async (req, res, next) => {
    const { email, username, password } = req.body;

    // 1) Check if email and password is not empty
    if ((!email && !username) || !password) {
        return next(new AppError("Please provides email or password!", 400));
    }

    var user
    if (email) {
        user = await User.findOne({ email }).select("+password");
    }
    else if (username) {
        user = await User.findOne({ username }).select("+password");
    }
    // // 2) Check if user exists && password is correct
    // const user = await User.findOne({ email }).select("+password");

    // if (!user || !(await user.correctPassword(password, user.password))) {
    //     return next(new AppError('Incorrect email or password', 401));
    // }

    if (!user || !(user.password === password)) {
        return next(new AppError("Incorrect email or password", 401));
    }

    // 3) If everything ok, send tocken to client
    const token = signTocken(user._id);
    res.status(200).json({
        status: "success",
        token,
        user
    });
});

exports.protect = tryCatch(async (req, res, next) => {
    // 1) Getting tocken and check of it's there
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }
    console.log(token);
    if (!token) {
        return next(
            new AppError("You are not logged in! Please log in to get access.", 401)
        );
    }
    // 2) Verification tocken
    const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decode.id);
    // 3) Check if user still exists
    if (!currentUser) {
        return next(
            new AppError(
                "The user belonging to this token does no longer exist.",
                401
            )
        );
    }

    // 4) Check if user changed password after the tocken was issued
    if (currentUser.changePasswordAfter(decode.iat)) {
        return next(
            new AppError("User recently changed password! Please log in again.", 401)
        );
    }

    req.user = currentUser;
    //Grant Access to protected Route
    next();
});
