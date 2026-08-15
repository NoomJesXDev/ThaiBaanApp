export async function sendPushMessage(
  lineUserId: string,
  messages: any[],
  communityAccessToken?: string
) {
  const token = communityAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error("LINE Channel Access Token is not configured");
    return { success: false, error: "LINE Channel Access Token is not configured" };
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("LINE Push Message Error", data);
      return { success: false, error: data };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error("LINE Push Message Exception", error);
    return { success: false, error: error.message || "Failed to send message" };
  }
}

export async function sendTextPush(
  lineUserId: string,
  text: string,
  communityAccessToken?: string
) {
  return sendPushMessage(
    lineUserId,
    [{ type: "text", text }],
    communityAccessToken
  );
}

export async function sendBillFlexPush(
  lineUserId: string,
  billData: {
    monthStr: string;
    houseNumber: string;
    ownerName: string;
    waterAmount: number;
    garbageAmount: number;
    funeralAmount: number;
    totalAmount: number;
    payUrl: string;
  },
  communityAccessToken?: string
) {
  // Flex Message JSON matching LINE specs
  const flexMessage = {
    type: "flex",
    altText: `แจ้งเตือนยอดค่าใช้จ่ายประจำเดือน ${billData.monthStr}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "แจ้งเตือนยอดค่าใช้จ่ายประจำเดือน",
            weight: "bold",
            size: "md",
            color: "#ffffff"
          },
          {
            type: "text",
            text: billData.monthStr,
            weight: "bold",
            size: "xl",
            color: "#ffffff",
            margin: "sm"
          }
        ],
        backgroundColor: "#1e3a8a"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `บ้านเลขที่ ${billData.houseNumber}`,
            weight: "bold",
            size: "lg",
            color: "#1e293b"
          },
          {
            type: "text",
            text: `ชื่อผู้จ่าย: ${billData.ownerName}`,
            size: "sm",
            color: "#64748b",
            margin: "xs"
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "ค่าน้ำประปา",
                    size: "sm",
                    color: "#64748b"
                  },
                  {
                    type: "text",
                    text: `${billData.waterAmount.toFixed(2)} บาท`,
                    size: "sm",
                    color: "#1e293b",
                    align: "end"
                  }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "ค่าเก็บขยะ",
                    size: "sm",
                    color: "#64748b"
                  },
                  {
                    type: "text",
                    text: `${billData.garbageAmount.toFixed(2)} บาท`,
                    size: "sm",
                    color: "#1e293b",
                    align: "end"
                  }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "เงินฌาปนกิจ",
                    size: "sm",
                    color: "#64748b"
                  },
                  {
                    type: "text",
                    text: `${billData.funeralAmount.toFixed(2)} บาท`,
                    size: "sm",
                    color: "#1e293b",
                    align: "end"
                  }
                ]
              }
            ]
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "ยอดรวมทั้งหมด",
                weight: "bold",
                size: "md",
                color: "#1e293b"
              },
              {
                type: "text",
                text: `${billData.totalAmount.toFixed(2)} บาท`,
                weight: "bold",
                size: "lg",
                color: "#059669",
                align: "end"
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#059669",
            action: {
              type: "uri",
              label: "ตรวจสอบยอดและแนบสลิป",
              uri: billData.payUrl
            }
          }
        ]
      }
    }
  };

  return sendPushMessage(lineUserId, [flexMessage], communityAccessToken);
}
