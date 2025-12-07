// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SurvivorZombies {
    // Struct to store user profile information
    struct UserProfile {
        string username;
        uint256 fid;        // Farcaster ID
        string pfp;         // Profile picture URL/hash
        uint256 score;
        bool exists;
    }
    
    // Mapping from user address to their profile data
    mapping(address => UserProfile) private userProfiles;
    
    // Array to keep track of all users who have scores
    address[] private users;
    
    // Events
    event ScoreUpdated(address indexed user, uint256 newScore, uint256 oldScore);
    event NewUserAdded(address indexed user, string username, uint256 fid, string pfp, uint256 score);
    event ProfileUpdated(address indexed user, string username, uint256 fid, string pfp);
    
    // Struct to return user data with all information
    struct UserScoreData {
        address user;
        string username;
        uint256 fid;
        string pfp;
        uint256 score;
    }
    
    /**
     * @dev Set or update score for the calling user with profile information
     * @param _score The score to set for the user
     * @param _username User's display name
     * @param _fid User's Farcaster ID
     * @param _pfp User's profile picture URL/hash
     */
    function setScore(
        uint256 _score, 
        string calldata _username, 
        uint256 _fid, 
        string calldata _pfp
    ) external {
        uint256 oldScore = userProfiles[msg.sender].score;
        
        // If user doesn't exist, add them to the users array
        if (!userProfiles[msg.sender].exists) {
            users.push(msg.sender);
            userProfiles[msg.sender] = UserProfile({
                username: _username,
                fid: _fid,
                pfp: _pfp,
                score: _score,
                exists: true
            });
            emit NewUserAdded(msg.sender, _username, _fid, _pfp, _score);
        } else {
            // Update existing user
            userProfiles[msg.sender].score += _score;
            userProfiles[msg.sender].username = _username;
            userProfiles[msg.sender].fid = _fid;
            userProfiles[msg.sender].pfp = _pfp;
        }
        
        emit ScoreUpdated(msg.sender, userProfiles[msg.sender].score, oldScore);
        emit ProfileUpdated(msg.sender, _username, _fid, _pfp);
    }
    
    /**
     * @dev Update only profile information without changing score
     * @param _username User's display name
     * @param _fid User's Farcaster ID
     * @param _pfp User's profile picture URL/hash
     */
    function updateProfile(
        string calldata _username, 
        uint256 _fid, 
        string calldata _pfp
    ) external {
        require(userProfiles[msg.sender].exists, "User does not exist");
        
        userProfiles[msg.sender].username = _username;
        userProfiles[msg.sender].fid = _fid;
        userProfiles[msg.sender].pfp = _pfp;
        
        emit ProfileUpdated(msg.sender, _username, _fid, _pfp);
    }
    
    /**
     * @dev Add score to existing user (without updating profile)
     * @param _score The score to add
     */
    function addScore(uint256 _score) external {
        require(userProfiles[msg.sender].exists, "User does not exist. Use setScore with profile data first.");
        
        uint256 oldScore = userProfiles[msg.sender].score;
        userProfiles[msg.sender].score += _score;
        
        emit ScoreUpdated(msg.sender, userProfiles[msg.sender].score, oldScore);
    }
    
    /**
     * @dev Get the score of a specific user
     * @param _user The address of the user
     * @return The user's score
     */
    function getScore(address _user) external view returns (uint256) {
        return userProfiles[_user].score;
    }
    
    /**
     * @dev Get the complete profile of a specific user
     * @param _user The address of the user
     * @return UserScoreData struct with all user information
     */
    function getUserProfile(address _user) external view returns (UserScoreData memory) {
        UserProfile memory profile = userProfiles[_user];
        return UserScoreData({
            user: _user,
            username: profile.username,
            fid: profile.fid,
            pfp: profile.pfp,
            score: profile.score
        });
    }
    
    /**
     * @dev Get the profile of the calling user
     * @return UserScoreData struct with caller's information
     */
    function getMyProfile() external view returns (UserScoreData memory) {
        UserProfile memory profile = userProfiles[msg.sender];
        return UserScoreData({
            user: msg.sender,
            username: profile.username,
            fid: profile.fid,
            pfp: profile.pfp,
            score: profile.score
        });
    }
    
    /**
     * @dev Get all users and their complete data sorted in descending order by score
     * @return Array of UserScoreData structs sorted by score (highest first)
     */
    function getAllScoresDescending() external view returns (UserScoreData[] memory) {
        uint256 userCount = users.length;
        UserScoreData[] memory userScoresList = new UserScoreData[](userCount);
        
        // Create array of UserScoreData structs
        for (uint256 i = 0; i < userCount; i++) {
            address userAddr = users[i];
            UserProfile memory profile = userProfiles[userAddr];
            userScoresList[i] = UserScoreData({
                user: userAddr,
                username: profile.username,
                fid: profile.fid,
                pfp: profile.pfp,
                score: profile.score
            });
        }
        
        // Sort in descending order using bubble sort
        for (uint256 i = 0; i < userCount; i++) {
            for (uint256 j = 0; j < userCount - i - 1; j++) {
                if (userScoresList[j].score < userScoresList[j + 1].score) {
                    // Swap elements
                    UserScoreData memory temp = userScoresList[j];
                    userScoresList[j] = userScoresList[j + 1];
                    userScoresList[j + 1] = temp;
                }
            }
        }
        
        return userScoresList;
    }
    
    /**
     * @dev Get the top N scores with complete profile data in descending order
     * @param _limit Maximum number of scores to return
     * @return Array of UserScoreData structs (top scores)
     */
    function getTopScores(uint256 _limit) external view returns (UserScoreData[] memory) {
        UserScoreData[] memory allScores = this.getAllScoresDescending();
        uint256 returnLength = _limit > allScores.length ? allScores.length : _limit;
        
        UserScoreData[] memory topScores = new UserScoreData[](returnLength);
        for (uint256 i = 0; i < returnLength; i++) {
            topScores[i] = allScores[i];
        }
        
        return topScores;
    }
    
    /**
     * @dev Get total number of users with scores
     * @return Number of users
     */
    function getTotalUsers() external view returns (uint256) {
        return users.length;
    }
    
    /**
     * @dev Check if a user has a profile recorded
     * @param _user The address to check
     * @return True if user has a profile, false otherwise
     */
    function hasProfile(address _user) external view returns (bool) {
        return userProfiles[_user].exists;
    }
    
    /**
     * @dev Get user's rank (1-indexed, 1 being the highest score)
     * @param _user The address of the user
     * @return The user's rank (0 if user not found)
     */
    function getUserRank(address _user) external view returns (uint256) {
        if (!userProfiles[_user].exists) {
            return 0; // User not found
        }
        
        uint256 userScore = userProfiles[_user].score;
        uint256 rank = 1;
        
        // Count how many users have higher scores
        for (uint256 i = 0; i < users.length; i++) {
            if (userProfiles[users[i]].score > userScore) {
                rank++;
            }
        }
        
        return rank;
    }
    
    /**
     * @dev Search user by FID
     * @param _fid The Farcaster ID to search for
     * @return UserScoreData struct if found, empty struct if not found
     */
    function getUserByFid(uint256 _fid) external view returns (UserScoreData memory) {
        for (uint256 i = 0; i < users.length; i++) {
            if (userProfiles[users[i]].fid == _fid) {
                address userAddr = users[i];
                UserProfile memory profile = userProfiles[userAddr];
                return UserScoreData({
                    user: userAddr,
                    username: profile.username,
                    fid: profile.fid,
                    pfp: profile.pfp,
                    score: profile.score
                });
            }
        }
        
        // Return empty struct if not found
        return UserScoreData({
            user: address(0),
            username: "",
            fid: 0,
            pfp: "",
            score: 0
        });
    }
}