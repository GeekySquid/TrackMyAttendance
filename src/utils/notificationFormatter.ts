/**
 * Utility to generate personalized, high-personality notification messages
 * based on the context of the action and the user.
 */

export type PersonalityType = 'success' | 'alert' | 'info' | 'attendance' | 'announcement';

interface PersonalityParams {
  userName?: string;
  senderName?: string;
  actionType: string;
  metadata?: any;
}

export const formatPersonalityMessage = (type: PersonalityType, params: PersonalityParams) => {
  const { userName, senderName, actionType, metadata } = params;
  const name = userName || 'Student';
  const sender = senderName || 'Admin';

  switch (type) {
    case 'success':
      return {
        title: `Big Win, ${name}! 🎉`,
        message: `High-five! 🙌 Your ${actionType} was successfully processed. Congrats! 🎊`
      };

    case 'alert':
      return {
        title: `Quick heads-up, ${name}`,
        message: `We couldn't process that ${actionType} just yet. ${metadata?.reason || "Don't worry, just double-check the details and try again! 🛡️"}`
      };

    case 'attendance':
      return {
        title: `Welcome, ${name}! 📍`,
        message: `You're all set! ${sender} confirmed your check-in at ${metadata?.location || 'Campus'}. Have a great session! 🚀`
      };

    case 'announcement':
      return {
        title: `Important Update 📢`,
        message: `Hey ${name}, ${sender} just posted a new announcement: "${actionType}". Take a quick look! 👀`
      };

    case 'info':
    default:
      return {
        title: `Status Update`,
        message: `Hey ${name}, quick heads-up: ${sender} just responded to your ${actionType}.`
      };
  }
};
