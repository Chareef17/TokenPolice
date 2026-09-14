import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder().setName("wallet").setDescription("สรุปประวัติการโหวตของ wallet/address")
    .addStringOption(o => o.setName("id").setDescription("เลข wallet หรือ address").setRequired(true)),
  new SlashCommandBuilder().setName("member").setDescription("ดูตารางโหวต กรองตามเมมเบอร์")
    .addStringOption(o => o.setName("name").setDescription("ชื่อเมมเบอร์").setRequired(true))
    .addStringOption(o => o.setName("event").setDescription("ชื่องาน เช่น GE4 (ไม่ใส่ = ทุกงาน)")),
  new SlashCommandBuilder().setName("transactions").setDescription("ดูธุรกรรมแยกรายการของ wallet/address")
    .addStringOption(o => o.setName("id").setDescription("เลข wallet หรือ address").setRequired(true))
    .addStringOption(o => o.setName("event").setDescription("กรองชื่องาน"))
    .addIntegerOption(o => o.setName("page").setDescription("หน้าที่ต้องการ").setMinValue(1)),
  new SlashCommandBuilder().setName("privacy").setDescription("ตั้งค่าการมองเห็นผลค้นหา (สำหรับผู้ดูแลเซิร์ฟเวอร์)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName("command").setDescription("คำสั่งที่ต้องการตั้งค่า").setRequired(true)
      .addChoices({ name: "wallet", value: "wallet" }, { name: "transactions", value: "transactions" }))
    .addStringOption(o => o.setName("visibility").setDescription("ใครมองเห็นผลลัพธ์ได้").setRequired(true)
      .addChoices({ name: "เฉพาะผู้ค้นหา", value: "private" }, { name: "ทุกคนในห้อง", value: "public" })),
  new SlashCommandBuilder().setName("forecast").setDescription("ดูผลคาดการณ์อันดับ GE6 ล่าสุด")
    .addSubcommand(s => s.setName("table").setDescription("ดูตารางอันดับคาดการณ์ล่าสุด")
      .addIntegerOption(o => o.setName("page").setDescription("หน้าที่ต้องการ").setMinValue(1)))
    .addSubcommand(s => s.setName("member").setDescription("ดูความน่าจะเป็นของเมมเบอร์")
      .addStringOption(o => o.setName("name").setDescription("ชื่อเมมเบอร์").setRequired(true))
      .addIntegerOption(o => o.setName("rank").setDescription("อันดับที่ต้องการดูเพิ่มเติม (1-58)").setMinValue(1).setMaxValue(58))),
  new SlashCommandBuilder().setName("whale").setDescription("ตั้งค่าและทดสอบ Whale Alert")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageChannels)
    .addSubcommand(s => s.setName("setup").setDescription("เลือกและล็อกห้อง Whale Alert")
      .addChannelOption(o => o.setName("channel").setDescription("ห้องสำหรับ Whale Alert").setRequired(true)
        .addChannelTypes(ChannelType.GuildText))
      .addNumberOption(o => o.setName("threshold").setDescription("ยอดขั้นต่ำ (ค่าเริ่มต้น 1,000 tokens)").setMinValue(0.000000000000000001)))
    .addSubcommand(s => s.setName("test").setDescription("ส่ง Whale Alert ทดสอบ")
      .addNumberOption(o => o.setName("amount").setDescription("จำนวนโหวต (tokens)").setRequired(true).setMinValue(0.000000000000000001))
      .addStringOption(o => o.setName("address").setDescription("address ตัวอย่าง"))
      .addStringOption(o => o.setName("tx").setDescription("transaction hash ตัวอย่าง")))
    .addSubcommand(s => s.setName("status").setDescription("ดูสถานะ Whale Alert"))
    .addSubcommand(s => s.setName("disable").setDescription("ปิด Whale Alert")),
  new SlashCommandBuilder().setName("ge6").setDescription("ดูรายชื่อผู้สมัครและเพลงที่คาดหวัง")
    .addSubcommand(s => s.setName("candidates").setDescription("ดูรายชื่อผู้สมัคร GE6 ทั้งหมด")
      .addIntegerOption(o => o.setName("page").setDescription("หน้าที่ต้องการ").setMinValue(1)))
    .addSubcommand(s => s.setName("member").setDescription("ดูข้อมูลและเพลงที่คาดหวังของเมมเบอร์")
      .addStringOption(o => o.setName("name").setDescription("ชื่อเมมเบอร์").setRequired(true).setAutocomplete(true))),
].map(c => c.toJSON());
