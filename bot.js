const { Bot, inlineKeyboard } = require('grammy');

const bot = new Bot(process.env.BOT_TOKEN);

bot.command('start', async (ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || 'https://example.com';

  const keyboard = inlineKeyboard().webApp(
    '🚀 ابدأ التحدي الآن (Quiz App)',
    webAppUrl
  );

  await ctx.reply(
    `أهلاً بك يا ${ctx.from.first_name}! 👋\n\n` +
    `مرحباً بك في منصة التحديات والأسئلة الاحترافية 🎯\n` +
    `اضغط على الزر أدناه لفتح التطبيق، اختيار قسمك المفضّل، وضبط مستوى الصعوبة من 20% وحتى 1000%!`,
    { reply_markup: keyboard }
  );
});

module.exports = bot;
