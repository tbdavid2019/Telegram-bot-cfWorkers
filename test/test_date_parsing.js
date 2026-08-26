// Test date parsing for calendar events
const testDateParsing = () => {
    const params = {
        date: "2026/01/05",
        time: "09:00",
        event: "測試事件",
        targetUser: "全家"
    };

    console.log("Original params:", params);

    // Method 1: Replace / with -
    const dateStr1 = params.date.replace(/\//g, '-');
    const dt1 = new Date(`${dateStr1}T${params.time}:00+08:00`);
    console.log("Method 1 (with timezone):", dt1.toString(), dt1.toISOString());

    // Method 2: Without timezone
    const dt2 = new Date(`${dateStr1}T${params.time}:00`);
    console.log("Method 2 (without timezone):", dt2.toString(), dt2.toISOString());

    // Method 3: Manual parsing
    const [year, month, day] = params.date.split('/');
    const [hour, minute] = params.time.split(':');
    const dt3 = new Date(year, month - 1, day, hour, minute);
    console.log("Method 3 (manual):", dt3.toString(), dt3.toISOString());

    // Method 4: UTC then adjust
    const dt4 = new Date(`${dateStr1}T${params.time}:00Z`);
    console.log("Method 4 (UTC):", dt4.toString(), dt4.toISOString());
};

testDateParsing();
