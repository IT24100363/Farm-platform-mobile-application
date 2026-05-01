import Notification from '../models/Notification.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    const notifs = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) { next(err); }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true }, { new: true });
    res.json(notif);
  } catch (err) { next(err); }
};
