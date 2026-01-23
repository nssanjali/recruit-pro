import 'dotenv/config';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy
const isGoogleConfigured = process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id' &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret';

if (isGoogleConfigured) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
                scope: ['profile', 'email']
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check if user already exists
                    let user = await User.findOne({ googleId: profile.id });

                    if (user) {
                        return done(null, user);
                    }

                    // Check if user exists with same email
                    user = await User.findOne({ email: profile.emails[0].value });

                    if (user) {
                        // Link Google account to existing user
                        user.googleId = profile.id;
                        user.authProvider = 'google';
                        user.avatar = profile.photos[0]?.value || user.avatar;
                        await User.save(user);
                        return done(null, user);
                    }

                    // Create new user
                    user = await User.create({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        googleId: profile.id,
                        authProvider: 'google',
                        avatar: profile.photos[0]?.value || 'https://via.placeholder.com/150',
                        role: 'candidate' // Default role, can be changed later
                    });

                    done(null, user);
                } catch (error) {
                    console.error('Google OAuth error:', error);
                    done(error, null);
                }
            }
        )
    );
} else {
    console.warn('Google OAuth credentials missing or using placeholders. Google login will be disabled.');
}

// GitHub OAuth Strategy
const isGithubConfigured = process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET;

if (isGithubConfigured) {
    passport.use(
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: process.env.GITHUB_CALLBACK_URL,
                scope: ['user:email']
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check if user already exists
                    let user = await User.findOne({ githubId: profile.id });

                    if (user) {
                        return done(null, user);
                    }

                    // Get primary email from GitHub
                    const email = profile.emails && profile.emails.length > 0
                        ? profile.emails.find(e => e.primary)?.value || profile.emails[0].value
                        : `${profile.username}@github.user`;

                    // Check if user exists with same email
                    user = await User.findOne({ email });

                    if (user) {
                        // Link GitHub account to existing user
                        user.githubId = profile.id;
                        user.authProvider = 'github';
                        user.avatar = profile.photos[0]?.value || user.avatar;
                        await User.save(user);
                        return done(null, user);
                    }

                    // Create new user
                    user = await User.create({
                        name: profile.displayName || profile.username,
                        email,
                        githubId: profile.id,
                        authProvider: 'github',
                        avatar: profile.photos[0]?.value || `https://github.com/${profile.username}.png`,
                        role: 'candidate' // Default role, can be changed later
                    });

                    done(null, user);
                } catch (error) {
                    console.error('GitHub OAuth error:', error);
                    done(error, null);
                }
            }
        )
    );
} else {
    console.warn('GitHub OAuth credentials missing or using placeholders. GitHub login will be disabled.');
}

export default passport;
