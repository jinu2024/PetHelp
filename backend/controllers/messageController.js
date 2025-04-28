const Message = require("../models/message");
const User = require("../models/user");

const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", userId] },
              "$receiver",
              "$sender",
            ],
          },
          lastMessage: { $first: "$content" },
          lastImage: { $first: "$image" },
          timestamp: { $first: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      // 👇 NEW PART: Lookup unread messages
      {
        $lookup: {
          from: "messages",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sender", "$$userId"] },
                    { $eq: ["$receiver", userId] },
                    { $eq: ["$read", false] },
                  ],
                },
              },
            },
          ],
          as: "unreadMessages",
        },
      },
      {
        $addFields: {
          unreadCount: { $size: "$unreadMessages" },
        },
      },
      {
        $project: {
          user: {
            _id: "$user._id",
            name: "$user.name",
            profilePic: "$user.profilePic",
          },
          lastMessage: {
            $cond: [
              { $and: [{ $ne: ["$lastMessage", ""] }, { $ne: ["$lastMessage", null] }] },
              "$lastMessage",
              {
                $cond: [
                  { $ne: ["$lastImage", null] },
                  "Image",
                  "",
                ],
              },
            ],
          },
          timestamp: 1,
          unreadCount: 1,
        },
      },
    ]);

    res.json({ conversations });
  } catch (err) {
    console.error("Get Conversations Error:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
};



const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getConversations, getMessages };