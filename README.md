# Personal App — Website

A personal organiser that runs in your web browser. It has six sections:
**Notes, Habits, Calendar, Calculator, Life and Settings**.

- No sign-up, no account, no server.
- Everything you type is saved only in your own browser, on your own device.
- It works without internet once it has loaded.
- It is built with plain HTML, CSS and JavaScript. There is nothing to install
  and nothing to build.

It is the website version of the Personal App phone app, and it can share
data with the phone app through a backup file (see
[Moving data between the phone and the website](#moving-data-between-the-phone-and-the-website)).

---

## Contents

- [How to open it](#how-to-open-it)
- [Finding your way around](#finding-your-way-around)
- [First-time tour](#first-time-tour)
- [Notes](#notes)
- [Habits](#habits)
- [Calendar](#calendar)
- [Calculator](#calculator)
- [Life](#life)
- [Settings](#settings)
- [Reminders and notifications](#reminders-and-notifications)
- [Where your data is kept](#where-your-data-is-kept)
- [Moving data between the phone and the website](#moving-data-between-the-phone-and-the-website)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Deploying it yourself](#deploying-it-yourself)
- [Project files](#project-files)

---

## How to open it

**Option 1 — open the file.** Double-click `index.html`. It opens in your
browser and works straight away, even with no internet.

**Option 2 — open it from a web address.** Put this folder on any static
web host (for example Vercel, Netlify or GitHub Pages) and open the `https://`
address. After the first visit the site saves a copy of itself, so it still
opens when you are offline. Your browser may also offer to **install it as an
app** so it gets its own window and icon.

**Option 3 — run it on your own computer.** Inside this folder run:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

---

## Finding your way around

- On a **computer**, the sections are listed in a sidebar on the left.
- On a **tablet**, they are shown as a narrow strip of icons on the side.
- On a **phone**, they are shown as a bar at the bottom of the screen.
- At the bottom of the sidebar you will see "Offline · data stays on this
  device", which is a reminder that nothing leaves your computer.
- Press **Alt + 1** to **Alt + 6** to jump straight to a section (1 = Notes,
  2 = Habits, 3 = Calendar, 4 = Calculator, 5 = Life, 6 = Settings).
- Press **/** to jump to the search box of the section you are in.
- On a phone, a round **New** button floats at the bottom right of Notes,
  Habits and Calendar for quickly adding something.

---

## First-time tour

The first time you open the site, a short six-page welcome tour appears. It
explains what each section is for.

- **Next** / **Back** move between pages. The left and right arrow keys do the
  same.
- The dots at the bottom let you jump to any page.
- **Skip** closes the tour at any time.
- **Get Started** on the last page closes it.

You can watch it again later from **Settings → About App → Replay Tutorial**.

---

## Notes

A place to write down ideas, lists and anything else you want to remember.

### The notes list

| Option | What it does |
| --- | --- |
| **New note** | Opens a blank note to start writing. |
| **Search box** | Finds notes whose title or text contains what you type. Press Esc or the small × to clear it. |
| **Grid / List button** | Switches between cards in a grid and a simple one-per-line list. |
| **Trash button** | Opens the Trash. The small number on it shows how many notes are in the Trash. |
| **⋮ (More options)** | Choose how notes are ordered, and whether archived notes are shown. |
| **Sort by Updated** | Most recently changed notes first. Pinned notes always stay on top in this order. |
| **Sort by Created** | Newest notes first, by the day they were made. |
| **Sort by Title** | Alphabetical order by title. |
| **Show Archived** | When on, archived notes also appear in the main list. When off, they are hidden. |

### Filter chips

The row of chips under the title narrows down the list. A chip only appears
when there is at least one note that matches it. Click a chip again to go back
to **All**.

| Chip | Shows |
| --- | --- |
| **All** | Every note that is not archived or in the Trash. |
| **Favorites** | Notes you have starred. |
| **Reminders** | Notes that have a reminder set. |
| **Priority** | Notes marked Medium or High priority. |
| **Archived** | Only notes you have archived. |

### What each note card shows

- The **title** (or "Untitled Note" if it has none) and the first part of the
  text.
- **Badges** for Pinned, priority (Low / Med / High) and Archived.
- A **bell** if a reminder is set. Hover over it to see when.
- A **star** you can click to add or remove it from favourites.
- When it was last changed ("Just now", "5m ago", "Yesterday", a date…) and
  how many words it has.
- The card is tinted in the note's colour if one is chosen.

### Note actions (the ⋮ on each card)

| Action | What it does |
| --- | --- |
| **Open** | Opens the note to read or edit it. |
| **Pin / Unpin** | Pinned notes stay at the top of the list. |
| **Add to / Remove from favorites** | Stars the note so it shows under the Favorites chip. |
| **Change color** | Gives the note one of 10 soft colours (Red, Orange, Yellow, Green, Cyan, Blue, Purple, Pink, Teal, Brown), or no colour. |
| **Priority** | Marks the note as No, Low, Medium or High priority. Medium and High show up under the Priority chip. |
| **Set / Edit reminder** | Pick a date and time (within the next year) to be reminded about this note. You can also remove the reminder here. |
| **Duplicate** | Makes a copy of the note, with "(copy)" added to the title. |
| **Share / Copy as text** | Opens your device's share menu if it has one. Otherwise it copies the title and text to the clipboard. |
| **Archive / Unarchive** | Moves the note out of the main list without deleting it. An **Undo** button appears for a few seconds. |
| **Select** | Starts selecting notes so you can act on several at once. |
| **Move to trash** | Sends the note to the Trash. An **Undo** button appears for a few seconds. |

### Selecting several notes

Click the small circle on a card, **Ctrl + click** a card, or press **Space**
on a focused card. The top bar then changes to:

- **Select all** — selects every note currently shown.
- **Move to trash** — moves all selected notes to the Trash (with Undo).
- **×** — stops selecting.

### Trash

Notes you delete go to the Trash first, so you can change your mind.

- **Restore** — puts the note back where it was.
- **Delete permanently** — removes that one note forever.
- **Empty Trash** — removes every note in the Trash forever.

### The note editor

When you open or create a note, the editor slides in.

**Top bar**

| Button | What it does |
| --- | --- |
| **← (back)** | Saves the note and closes the editor. Esc does the same. |
| **★ Star** | Adds or removes the note from favourites. |
| **Palette** | Changes the note's colour. |
| **Bell** | Sets, changes or removes a reminder. |
| **⋮ More** | Pin, set priority, duplicate, share / copy, archive, or delete the note. |
| **Save** | Saves and closes. |

**Writing area**

- **Title** — up to 100 characters. A counter shows how many you have used and
  turns to a warning colour after 80. Press Enter to jump down to the text.
- **Text** — the main body of the note. Pasted text comes in as plain text, so
  it does not bring in odd fonts or colours.

**Formatting toolbar**

| Button | What it does | Shortcut |
| --- | --- | --- |
| Undo / Redo | Step back or forward through your changes. | Ctrl + Z / Ctrl + Y |
| **Bold** | Makes text thick. | Ctrl + B |
| *Italic* | Makes text slanted. | Ctrl + I |
| Underline | Draws a line under text. | Ctrl + U |
| ~~Strikethrough~~ | Draws a line through text. | Ctrl + Shift + X |
| Numbered list | 1, 2, 3… list. | Ctrl + Shift + 7 |
| Bullet list | • dotted list. | Ctrl + Shift + 8 |
| Checklist | A list with tick boxes. Click the box to tick or untick an item. | Ctrl + Shift + 9 |
| Quote | Shows the paragraph as an indented quote. Click again to turn it off. | — |
| Clear format | Removes all formatting from the selected text. | — |

**Bottom bar**

- Word count of the note.
- Save status: "Unsaved changes" while you type, then "Saved".
- The date and time the note was created.

**Saving.** You never have to remember to save. The note saves itself a moment
after you stop typing, when you close it, and when you leave the page. A brand
new note that is still completely empty is simply thrown away when you close
it.

---

## Habits

Track the things you want to do regularly, and see your streaks grow.

### Top bar

| Option | What it does |
| --- | --- |
| **Search** | Finds habits by name. |
| **Today / Details** | Switches between today's checklist and the detailed history of one habit. |
| **✓✓ Mark all done** | Marks every unfinished habit as done for today (asks first). Count + Target habits are filled up to their target. |
| **New habit** | Opens the habit editor to create a habit. |

### Creating or editing a habit

| Field | What it does |
| --- | --- |
| **Preview** | Shows how the habit will look as you fill in the form. |
| **Habit Name** | Required. Up to 60 characters, e.g. "Read 10 pages". |
| **Icon** | Pick from 54 icons. Use the category chips (Health, Mind, Self-Care, Play, Finance, Social, Home, Goals) to narrow them down, or **All** to see every one. |
| **Color** | Pick one of 12 colours, or the palette swatch for any colour you like. |
| **Tracking Type** | How you count the habit — see the table below. |
| **Daily Target** | Only for Count + Target. How many times a day counts as "done" (1 to 999). |
| **Reminder (optional)** | A time of day to be reminded. **Clear** removes it. |
| **Delete Habit** | Only when editing. Deletes the habit and all of its history (asks first). |

If you close the editor after making changes, it asks whether you want to
discard them, so you do not lose work by accident.

**Tracking types**

| Type | Meaning | Example |
| --- | --- | --- |
| **Yes / No** | Either you did it today or you didn't. | "Meditate" |
| **Count + Target** | Count how many times, with a daily goal. Done once you reach the goal. | "Drink 8 glasses of water" |
| **Free Count** | Count how many times, with no goal. Done once the count is at least 1. | "Push-ups" |

### Today view

- **Progress ring** — the percentage of habits done today, with "X of Y Habits
  Done" and an encouraging message that changes as you go.
- **Habit list** — one row per habit.
  - For **Yes / No** habits, click the row or the tick button to mark it done or
    not done.
  - For **count** habits, click the row or **+** to add one, and **−** to take
    one away. Count + Target habits also show a small progress bar.
  - If a reminder is set, its time is shown under the name.
- **Drag to reorder** — grab the handle on the left of a row and drop it where
  you want it.
- **This week** grid — a table of every habit against each day of the current
  week (Monday to Sunday). Click a day to log it. For count habits, click adds
  one and right-click removes one. Future days are locked.
- When every habit is done for the day, a small "All habits done! Great job!"
  message appears.

**Row menu (⋮)**

| Action | What it does |
| --- | --- |
| **Edit** | Opens the habit editor. |
| **Set reminder** | Choose or remove a daily reminder time. |
| **View details** | Opens this habit in the Details view. |
| **Move up / Move down** | Changes the habit's position in the list (not available while searching). |
| **Select** | Starts selecting habits so you can delete several at once. |
| **Delete** | Deletes the habit and its history. An **Undo** button appears for a few seconds. |

**Selecting several habits.** **Ctrl + click** rows or use **Select** from the
menu. Then use **Select all** or **Delete**.

### Details view

Pick a habit from the chips at the top to see:

- **Header** — the habit's icon, name, tracking type, reminder time, and
  buttons to edit, set a reminder, or delete it.
- **Week strip** — the seven days of a week. Use the arrows to move to earlier
  weeks and **Today** to come back. Click a day to log it (right-click removes
  one for count habits).
- **Monthly Overview** — a calendar of the month with logged days highlighted.
  Use the arrows to move between months. You can log or un-log past days here
  too.
- **Stats**
  - **Completed** — how many days this month the habit was done, and the
    percentage.
  - **Current Streak** — how many days in a row you have done it, up to today
    (or yesterday, if today isn't done yet).
  - **Best Streak** — the longest run of days in a row ever.

### When you have no habits yet

You will see a **Create Custom Habit** button and four quick suggestions
(**Read, Meditate, Walk, Drink Water**). Click a suggestion to add it in one
click.

---

## Calendar

Plan events and see them by month, week, day or as a list.

### Top bar

| Option | What it does |
| --- | --- |
| **Search** | Finds events whose title or notes contain what you type. |
| **Filter** | Shows only one category: General, Work, Personal or Urgent. Choose **All Categories** to see everything. |
| **Month / Week / Day / Agenda** | Changes the layout. The site remembers your last choice. |
| **New event** | Adds an event on the selected day. |

Below the top bar:

- **‹ and ›** move to the previous or next month, week or day.
- **Today** jumps back to today.
- When a search or filter is active, a bar shows what is being filtered, with
  **Clear filters** to remove it.

### The four views

| View | What you see |
| --- | --- |
| **Month** | A grid of the whole month. Each day shows up to 3 events and "+N more" if there are extra. Click a day to see its events in the side panel. Double-click a day (or press Enter) to add an event on it. Arrow keys move between days. |
| **Week** | Seven columns, one per day, with that day's events. Click a day's header to select it, or the **+** at the bottom of a column to add an event there. |
| **Day** | An hour-by-hour timeline from 12 AM to 11 PM, with all-day events at the top. The current hour is highlighted. Double-click a time slot to add an event. |
| **Agenda** | Every event in date order as one long list, grouped by day. It scrolls to the next upcoming day for you. |

The **side panel** (in Month and Week view) lists the events of the selected
day, with a **+** button to add one.

Click any event to edit it, or use its **⋮** menu to **Edit** or **Delete**
it. Deleting shows an **Undo** button for a few seconds.

### Adding or editing an event

| Field | What it does |
| --- | --- |
| **Title** | Required. Up to 80 characters. |
| **Date** | The day of the event (up to 5 years back or 10 years ahead). |
| **Time / All day** | Turn **All day** off to pick a start time. |
| **Category** | General, Work, Personal or Urgent. Each has its own colour so you can tell them apart at a glance. |
| **Repeat** | None, Daily, Weekly or Monthly. |
| **Ends on** | Only when repeating. The last day the event repeats. |
| **Notes (optional)** | Extra details, up to 300 characters. |
| **Delete** | Only when editing. Removes the event. |

How repeating works:

- **Daily** — every day from the start date until the end date.
- **Weekly** — the same weekday every week.
- **Monthly** — the same date every month (for example, every 15th).

If you close the editor after changing something, it asks before throwing your
changes away.

**Week start.** Whether weeks start on Monday or Sunday is set in
**Settings → Appearance → Week starts Monday**.

---

## Calculator

A calculator with a simple mode and a scientific mode, a memory, and a history
of your past calculations.

### Display

- The top line shows what you have typed. The large line shows the answer.
- Numbers are shown with commas (1,234,567) to make them easier to read.
- An **M** badge appears when something is stored in memory.
- The **copy** button copies the answer. If **Copy Result on Tap** is on in
  Settings, clicking the answer copies it too.
- Expressions can be up to 50 characters long.
- Error messages you might see: **Cannot divide by zero**, **Incomplete
  expression** (for example a missing bracket) and **Error**.

### Keys

| Key | What it does |
| --- | --- |
| **0 – 9, .** | Type numbers and a decimal point. |
| **+ − × ÷** | Add, subtract, multiply, divide. Pressing a second operator replaces the first. |
| **=** | Works out the answer and saves it to History. |
| **C** | Clears everything. |
| **CE** | Clears the current entry. |
| **⌫** | Deletes the last character. |
| **±** | Switches the number between positive and negative. |
| **Scientific ON / OFF** | Shows or hides the extra keys below. |

**Scientific keys**

| Key | What it does |
| --- | --- |
| **sin, cos, tan** | Trigonometry, using radians. |
| **log** | Logarithm base 10. |
| **ln** | Natural logarithm. |
| **√** | Square root. |
| **x²** | Squares the whole expression. |
| **^** | Power, e.g. 2^8 = 256. |
| **%** | Percent, e.g. 50% = 0.5. |
| **( )** | Brackets to group parts of a calculation. |
| **π, e** | The constants pi (3.14159…) and e (2.71828…). |
| **MC** | Memory Clear — sets memory back to 0. |
| **MR** | Memory Recall — puts the stored number into your calculation. |
| **M+** | Adds the current answer to memory. |
| **M−** | Takes the current answer away from memory. |

Memory is kept until you close or reload the page.

### History

- Shows your last 50 calculations, newest first, with when you did them.
- Click an entry to put that calculation back on the display.
- The **copy** icon copies that answer; the **×** deletes the entry (with
  Undo).
- **Clear** removes all history (asks first).

### Using the keyboard

| Key | Does |
| --- | --- |
| Numbers, `+ - * / ^ ( ) %` | Type them |
| `x` | Multiply |
| `,` | Decimal point |
| Enter or `=` | Equals |
| Backspace | Delete last character |
| Esc | Clear all |
| Delete | Clear entry |
| `s` `c` `t` | sin, cos, tan |
| `l` `n` | log, ln |
| `r` | Square root |
| `p` `e` | π, e |
| `q` | x² |

---

## Life

A view of your life in numbers, to help you keep perspective.

To start, click **Enter Date of Birth** and pick your birthday. Then you will
see:

| Card | What it shows |
| --- | --- |
| **Time elapsed since birth** | Your age in years, months and days. |
| **Life Progress Meter** | What percentage of your expected life you have lived, as a bar. The colour changes as you move from "Early years" to "Past halfway" to "Final stretch". |
| **Expected remaining time** | The years, months and days left until your expected life span, plus a live countdown of the time left today. |
| **Upcoming Milestones** | Days until your next birthday (and "Happy Birthday!" on the day itself), and when you will reach your next 1,000-day mark (Day 10,000, Day 11,000…). |
| **Real-time life metrics** | Total days, weeks, hours, minutes and seconds you have lived, updating every second. |

Buttons at the top:

| Button | What it does |
| --- | --- |
| **"80 yrs"** | Changes your expected life span (1 to 120 years). The default is 80. This only affects the meter and the remaining time. |
| **Pencil** | Changes your date of birth. |
| **Reset** | Removes your date of birth and goes back to the start screen. |

---

## Settings

### Appearance

| Option | What it does |
| --- | --- |
| **Theme: Light / Dark / System** | Light and Dark force that look. System follows your computer's setting and changes automatically when it does. |
| **Accent Color Theme** | Picks the main colour of the whole app. There are 16 preset colours, plus the palette swatch for any colour you like. The app builds a full matching colour scheme from it, for both light and dark mode. |
| **Default** | Appears when you have changed the accent colour. Puts it back to the original blue. |
| **Week starts Monday** | When on, calendar weeks start on Monday. When off, they start on Sunday. |
| **Reset All Settings** | Puts every setting back to how it was at the start. Your notes, habits, events and history are **not** touched. |

### Notifications

| Option | What it does |
| --- | --- |
| **Enable Notifications** | The main switch for all reminders. Turning it on asks your browser for permission to show pop-up alerts. |
| **Habit Reminders** | Reminds you at the time set on each habit. |
| **Event Reminders** | Reminds you about calendar events on the day: at the event's time, or at 9:00 AM for all-day events. |
| **Send a test notification** | Sends a sample alert so you can check that reminders reach you. |

If the browser has blocked notifications, a message here tells you how to fix
it. Even when pop-ups are blocked, reminders still appear as a message inside
the page.

### Data Management

| Option | What it does |
| --- | --- |
| **Counts** | Shows how many notes, habits, events and calculations you have. |
| **Export All Data** | Downloads a backup file named `personal_app_backup_YYYY-MM-DD.json` with everything in it. |
| **Import Data** | Loads a backup file. This **replaces** everything currently in the app, so it asks first. It also works with backups made on the phone app. |
| **Clear All Data** | Deletes all notes, habits, events, calculator history and life tracker data. You must type `DELETE` to confirm, so it can't happen by accident. |
| **Storage used** | The note at the bottom shows how much space your data is taking in the browser. |

### Life Tracker

| Option | What it does |
| --- | --- |
| **Set Date of Birth** | Shown when no birthday is saved yet. Turns on the Life section. |
| **Date of Birth** | Change your saved birthday. |
| **Life Expectancy** | Change your expected life span (1–120 years). |
| **Reset Life Tracker** | Removes your birthday and all life numbers. |

### Calculator

| Option | What it does |
| --- | --- |
| **Scientific Mode** | Shows the scientific keys (sin, cos, log, π, e and more) in the Calculator. |
| **Copy Result on Tap** | When on, clicking the answer in the Calculator copies it to the clipboard. |
| **Clear Calculator History** | Deletes all past calculations. |

### Offline & Install

Tells you whether the site is ready to work without internet:

- **Opened from a file** — it already works offline.
- **Saved for offline use** — it has saved a copy and will open without
  internet.
- **Installed as an app** — it is running as its own app.
- **Install app** — appears when your browser lets you install the site as an
  app with its own window and icon.

### Keyboard Shortcuts

A quick list of the shortcuts (also listed [below](#keyboard-shortcuts)).

### About App

| Option | What it does |
| --- | --- |
| **Version** | The app version. |
| **Source Code** | Opens the project's code on GitHub. |
| **Licenses** | Shows the open-source licences for the icons and colour system used. |
| **Replay Tutorial** | Shows the welcome tour again. |

---

## Reminders and notifications

- Reminders can be set on **notes** (a single date and time), **habits** (a
  daily time) and **events** (on the day they happen).
- The site checks for due reminders every 20 seconds while it is open.
- A reminder is still shown if it is up to 10 minutes late (for example, if
  your computer was asleep), and each reminder is only shown once.
- Clicking a reminder takes you to the note, habit list or calendar it belongs
  to.
- **Important:** a website can only remind you while it is open in a browser
  tab. The tab can be in the background, but if it is closed at the reminder
  time, nothing will pop up. The phone app does not have this limit.

---

## Where your data is kept

- Everything is saved in your browser's local storage on this device. Nothing
  is uploaded anywhere — no accounts, no servers, no tracking.
- Each browser and each computer keeps its own separate copy.
- If you clear your browser's site data, your app data is deleted too.
  **Export a backup now and then** (Settings → Data Management).
- If you have the site open in two tabs, a change in one shows up in the other.
- Some browsers, and private / incognito windows, block local storage. If that
  happens the app warns you that changes will be lost when you close the tab.
- When the site is opened as a local file, some browsers share storage between
  all local files, and some block it entirely. Opening it from a web address
  avoids this.

---

## Moving data between the phone and the website

The backup file uses the same format as the Personal App phone app.

- A backup exported on the **phone** can be imported on the **website**.
- A backup exported on the **website** can be imported on the **phone**.
- The website adds one extra section, `preferences` (theme, accent colour,
  calculator options), so a website-to-website restore keeps your look too.
  The phone app simply ignores it.
- Importing **replaces** what is already there; it does not merge.
- Any broken entries in a file are skipped, and you are told how many.

---

## Keyboard shortcuts

| Keys | What it does |
| --- | --- |
| Alt + 1 … 6 | Jump to Notes, Habits, Calendar, Calculator, Life, Settings |
| / | Go to the search box of the current section |
| Esc | Close a dialog, or save and close the note editor |
| Ctrl + S | Save and close the note |
| Ctrl + B / I / U | Bold / italic / underline |
| Ctrl + Shift + X | Strikethrough |
| Ctrl + Shift + 7 / 8 / 9 | Numbered list / bullet list / checklist |
| Ctrl + click | Select several notes or habits |
| Arrow keys (Calendar month view) | Move between days |
| Enter (Calendar month view) | Add an event on the selected day |
| Calculator keys | See [Using the keyboard](#using-the-keyboard) |

---

## Deploying it yourself

This is a static site: there is no build step. Any static host works.

**Vercel**

1. Import this repository at <https://vercel.com/new>.
2. Leave the framework preset as **Other**, with no build command and the
   output directory as the project root.
3. Deploy.

Or from the command line, inside this folder:

```bash
npx vercel --prod
```

**Updating a deployed copy.** If you change any file, also change `VERSION`
in `sw.js` (for example `personal-app-web-v1` → `personal-app-web-v2`).
Otherwise visitors who already have the offline copy will keep seeing the old
version.

---

## Project files

```
index.html               the page itself
manifest.webmanifest     app name, icons and shortcuts for installing
sw.js                    saves the site for offline use (only on http/https)
vercel.json              hosting settings for Vercel
css/app.css              all of the styling
js/icons.js              the icons used in the app (Material Symbols, Apache 2.0)
js/m3.js                 builds the colour scheme from the accent colour
js/util.js               shared helpers: dates, dialogs, menus, pop-up messages
js/store.js              saving and loading data, backup export / import
js/delta.js              converts note text to and from the phone app's format
js/theme.js              light / dark mode and colours
js/notify.js             reminders and notifications
js/views/notes.js        Notes section
js/views/habits.js       Habits section
js/views/calendar.js     Calendar section
js/views/calculator.js   Calculator section
js/views/life.js         Life section
js/views/settings.js     Settings section
js/views/onboarding.js   first-time welcome tour
js/app.js                navigation between sections and start-up
icons/                   app icons
```

---

## Author

[kssaichandan](https://github.com/kssaichandan)
