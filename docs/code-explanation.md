# student.c: Beginner's Code Explanation

Throughout this file, **n** means the number of students currently stored (n is at most 100).

## 1. Overall flow

```
start
  |
main(argc, argv)
  |-- loadStudents()            read data/students.txt into the students array
  |
  |-- argc == 1 ?  YES -> runMenuMode()   show menu, repeat until user picks Exit
  |               NO  -> runApiMode()     do ONE command, print ONE JSON line
  |
end
```

Both modes use the same **core operations** (`addStudent`, `searchStudent`, `updateStudent`, `deleteStudent`) and helpers for grades, sorting and statistics. The menu shows words for people, while API mode prints one JSON line for programs.

Every operation that changes data ends by calling `saveStudents()`, so the file always matches the array.

## 2. Data used by the program

```c
struct Student { int roll; char name[50]; int marks; };
struct Student students[100];   // the list
int studentCount = 0;           // how many are really used
struct Student foundStudent;    // the record the last operation touched
```

The array always has 100 slots, but only slots `0 .. studentCount-1` hold real students.
`foundStudent` is a "result tray": after `add`, `search`, `update` or `delete` succeeds, the record is copied here so the printing code knows what to show.
The grade is calculated from `marks` when a student is printed; it is not stored in the file.

**Global variables**: these three are declared outside every function so all functions can use them. This avoids passing pointers around, which beginners have not learned yet.

## 3. Every function

| Function | Purpose | Inputs | Output |
|---|---|---|---|
| `stringLength` | Counts characters in a text (our own `strlen`) | `text` | the length |
| `isValidName` | Checks the name rules | `name` | 1 if valid, 0 if not |
| `convertToNumber` | Turns digit text like `"85"` into 85 | `text` | the number, or -1 if bad |
| `parseRoll` | Roll must be 1 to 999999999 | `text` | roll, or -1 |
| `parseMarks` | Marks must be 0 to 100 | `text` | marks, or -1 |
| `readLine` | Reads a whole typed line (spaces allowed) | `text` (to fill), `size` (room available) | 1 normally, 0 when input has ended |
| `findStudentIndex` | Looks up a roll number | `roll` | array position, or -1 |
| `loadStudents` | Reads the file into the array | none | nothing (fills `students`, `studentCount`) |
| `saveStudents` | Writes the array to the file | none | 1 success, 0 failure |
| `addStudent` | Validates and adds a student | roll text, name, marks text | error code (0 = OK) |
| `searchStudent` | Finds a student | roll text | error code |
| `updateStudent` | Changes name and/or marks | roll text, new name, marks text, `keepName`, `keepMarks` | error code |
| `deleteStudent` | Removes a student | roll text | error code |
| `getGrade` | Calculates the grade for marks | `marks` | grade letter |
| `sortStudents` | Copies records and sorts by marks, highest first | sorted array | nothing |
| `findHighestIndex`, `findLowestIndex` | Find first highest/lowest record | none | array index |
| `getTotalMarks` | Adds all marks | none | total |
| `printErrorText` | Prints the message for an error code | code | nothing (prints) |
| `showError` | Menu mode: prints "Error: message" | code | nothing |
| `printStudentLine` | Menu mode: prints one student | a student | nothing |
| `printStudentJson` | API mode: prints one student as JSON | a student | nothing |
| `printApiResult` | API mode: prints the final JSON line (ok or error) | error code | nothing |
| `printApiList` | API mode: prints all students as a JSON array | none | nothing |
| `printApiSortedList`, `printApiStats` | API mode: prints sorted records or statistics | none | nothing |
| `runApiMode` | Chooses the command from `argv` and runs it | `argc`, `argv` | nothing |
| `printMenu` | Prints the menu text | none | nothing |
| `menuAddStudent`, `menuSearchStudent`, `menuUpdateStudent`, `menuDeleteStudent`, `menuListStudents`, `menuSortStudents`, `menuStats` | Ask the user for input or display results | none | nothing |
| `runMenuMode` | The menu loop | none | nothing |
| `main` | Loads data, picks the mode | `argc`, `argv` | 0 |

**Error codes**: functions return a small number: 0 = no problem, 1 = bad roll, 2 = bad name, 3 = bad marks, 4 = duplicate, 5 = not found, 6 = list full, 7 = save failed, 8 = unknown command, 9 = wrong argument count, 10 = no students for statistics. `#define` gives each number a readable name such as `ERR_DUPLICATE`.

## 4. Every loop

| Where | What it repeats | How many times |
|---|---|---|
| `stringLength` (`while`) | Moves along the text until the end marker `'\0'` | L times, where L is the text length (at most 49 in practice; it is a few characters) |
| `isValidName` (`for`) | Checks each character of the name | L times (L is at most 49) |
| `convertToNumber` (`for`) | Checks each digit and builds the number | L times (at most 9) |
| `readLine` (`while`) | Reads one character at a time until Enter | one time per typed character |
| `findStudentIndex` (`for`) | Compares each stored roll with the wanted roll | up to n times (stops early when found) |
| `loadStudents` (`while`) | Reads one line of the file into one array slot | n times (one per record, max 100) |
| `saveStudents` (`for`) | Writes one student per line | n times |
| `deleteStudent` (`for`) | Slides each later student one place left | n - 1 - index times (at most n - 1) |
| `printApiList` (`for`) | Prints each student as JSON | n times |
| `sortStudents` (copy `for`) | Copies records before sorting | n times |
| `sortStudents` (insertion `while`) | Moves lower-mark records right | at most n - 1 insertions |
| stats helpers (`for`) | Find the high, low and total | n times each |
| `menuListStudents` (`for`) | Prints each student | n times |
| `menuSortStudents` (`for`) | Prints sorted students | n times |
| `runMenuMode` (`while`) | Shows the menu and handles one choice | once per menu choice, until the user picks Exit (or input ends) |

Note: the loops over text length (L) are tiny because names are at most 49 characters and numbers at most 9 digits.

## 5. How file saving and loading work

**File format** (`data/students.txt`): one student per line, fields separated by `|`:

```
101|Ravi Kumar|85
102|Anita|92
```

**Saving** (`saveStudents`):
1. `fopen("data/students.txt", "w")` opens the file for writing. "w" erases the old content.
2. If `fopen` gives `NULL`, the file could not be opened (for example the `data` folder does not exist), so we return 0.
3. A loop runs `fprintf(file, "%d|%s|%d\n", ...)` once per student. This works just like `printf` but writes into the file.
4. `fclose(file)` finishes the writing and releases the file.

**Loading** (`loadStudents`):
1. `fopen(..., "r")` opens for reading. If the file does not exist yet, `NULL` comes back and we simply start with no students.
2. `fscanf(file, " %d|%49[^|]|%d", &roll, name, &marks)` reads one record.
   - `%d` reads a number.
   - `|` must match the separator.
   - `%49[^|]` means "read up to 49 characters that are NOT a `|`". That is how names with spaces are read (plain `%s` would stop at the first space).
   - The space at the start skips the newline from the previous line.
   - It returns how many fields it filled. We continue only while it returns 3.
3. Each record is copied into the next free array slot, and `studentCount` goes up by one.
4. `fclose(file)`.

**Why save after every change?** If the program or computer stops suddenly, nothing is lost. In API mode, each command is a separate run of the program that begins by loading the file, so saving is required.

## 6. Why each data type was chosen

| Item | Type | Why |
|---|---|---|
| `roll` | `int` | A whole number, and we limit it to 9 digits so it always fits in an `int`. We do not do maths with it, but comparing with `==` is fast and simple. |
| `marks` | `int` | A whole number from 0 to 100. `int` is the natural choice (`char` would work but is confusing for beginners). `float` is wrong because marks are whole numbers. |
| `name` | `char name[50]` | C has no string type; text is an array of characters. 49 letters + 1 slot for the end marker `'\0'` = 50. |
| `students` | array of `struct Student`, size 100 | The task fixes the maximum at 100, so a fixed-size array is enough (no `malloc` needed). |
| `studentCount` | `int` | Counts the used slots. |
| error codes | `int` with `#define` names | Easy to compare in `if` and `switch`, and readable. |
| `FILE *` | file handle | Required by `fopen`; we only pass it to `fscanf`/`fprintf`/`fclose`. |

## 7. How argc and argv work

When you type `./student add 101 Ravi 85`, the operating system splits the line into words and gives them to `main`:

```c
int main(int argc, char *argv[])
```

| Word | Position in `argv` |
|---|---|
| `./student` | `argv[0]` (the program's own name) |
| `add` | `argv[1]` (the command) |
| `101` | `argv[2]` |
| `Ravi` | `argv[3]` |
| `85` | `argv[4]` |

`argc` = number of words = **5** here. Plain `./student` gives `argc = 1`, which our program treats as "menu mode". Everything is text, so `"101"` must be converted to the number 101 by `convertToNumber`.
`strcmp(argv[1], "add") == 0` is how we test whether the command is `add` (`strcmp` returns 0 when two texts are equal; you cannot compare texts with `==`).

The `char *argv[]` is a pointer type. C forces this form on `main`, so it is the unavoidable pointer in the program (the only others are the `FILE *` handles and the `&` in `scanf`/`fscanf`).

## 8. Time complexity in plain words

n = number of stored students (at most 100).

| Operation | Time | In plain words |
|---|---|---|
| Load at start | O(n) | Reads each record once. |
| Save | O(n) | Writes each record once. |
| Search | O(n) | In the worst case we look at every student once. |
| Add | O(n) | One scan to check the roll is unique, then a save (also O(n)). The actual insert at the end is a single step. |
| Update | O(n) | Find the student (scan), change it, save. |
| Delete | O(n) | Find (scan), slide the later students left (scan), save. |
| List | O(n) | Prints each student once. |

All operations are linear: if you had twice as many students, they would take about twice as long. With a limit of 100 this is instant. Searching is not faster than O(n) because the list is not sorted; with a sorted list we could use binary search (O(log n)), but it is not needed here.

## 9. Ten viva questions with answers

**1. What is a `struct` and why did you use one?**
A struct groups related variables of different types under one name. `struct Student` keeps roll, name and marks together, so one array element is one complete student.

**2. Why does `char name[50]` store only 49 letters?**
C text ends with a hidden `'\0'` character, which needs one slot. So 50 slots hold 49 visible characters.

**3. Why can't you compare two texts with `==`?**
`==` would compare where the arrays are stored in memory, not what is written in them. `strcmp` compares the characters and returns 0 when they are the same.

**4. What do `argc` and `argv` mean?**
`argc` is the number of command-line words, including the program name. `argv` is the array of those words as text. `argv[0]` is the program name, `argv[1]` the first real argument.

**5. Why do you use `&` in `scanf` and `fscanf` but not for the `name` array?**
`scanf` must know where in memory to store the value, so numbers need `&` (their address). An array name already stands for the address of its first element, so `name` needs no `&`.

**6. What is the difference between `fopen` modes "r" and "w"?**
"r" opens an existing file for reading (returns `NULL` if the file is missing). "w" opens for writing; it creates the file if needed and erases any old content.

**7. Why must you check whether `fopen` returned `NULL`?**
If the file could not be opened and we still try to read or write, the program may crash. `NULL` means failure, so we handle that case first.

**8. How does your delete work?**
It finds the position `index` of the student, then a loop copies each later student one place to the left (`students[i] = students[i+1]`), and finally `studentCount` is reduced by 1. Then the file is saved.

**9. What is the time complexity of searching, and can it be improved?**
O(n) because we may check every student. It could be improved to O(log n) with a sorted array and binary search, but for at most 100 students it makes no practical difference.

**10. How do you make sure roll numbers are unique?**
Before adding, `findStudentIndex(roll)` scans the array. If it returns anything other than -1, the roll already exists and we return `ERR_DUPLICATE` without adding.

**Bonus (examiners like these): Why do you read numbers as text first?**
`scanf("%d")` goes wrong when the user types letters: it leaves the bad characters in the input and loops can repeat forever. Reading the whole line as text and converting it ourselves with `convertToNumber` lets us reject bad input safely with a clear message.

---

# New sections: grade, sort and stats

These sections continue after Section 9. In them, **n** is still the number of stored students (at most 100).

## 10. What changed

| Change | Where |
|---|---|
| New function `getGrade` | Section 1 (helpers) |
| New functions `sortStudents`, `findHighestIndex`, `findLowestIndex`, `getTotalMarks` | helpers |
| New functions `printApiSortedList`, `printApiStats` | Section 4 (output) |
| `printStudentLine` and `printStudentJson` now also print the grade | Section 4 |
| `runApiMode` understands `sort` and `stats` | Section 5 |
| New functions `menuSortStudents` and `menuStats`; the menu has 8 options | Section 6 |
| New error code `ERR_NO_STUDENTS` (10) | top of the file |

**Menu numbers moved:** Sort is now 6, Statistics is 7 and Exit is **8** (it was 6).

## 11. Grade

```c
char getGrade(int marks) {
    if (marks >= 90) { return 'A'; }
    if (marks >= 75) { return 'B'; }
    if (marks >= 60) { return 'C'; }
    if (marks >= 40) { return 'D'; }
    return 'F';
}
```

- **Purpose:** turns marks into a grade letter. **Input:** `marks`. **Output:** one character.
- **How it works:** the checks go from the highest band down. The first `if` that is true returns, so a student with 92 never reaches the `>= 75` check. Anything that passes none of the four checks is below 40, so it is an F.
- **Why `char`:** a grade is exactly one letter, and `char` holds one character. We print it with `%c` (`%s` is for whole texts).
- **Why the grade is not stored:** it can always be worked out from the marks. If we saved it in the file too, a hand-edited file could contain marks 90 with grade F. Working it out every time means the two can never disagree, and the file format `roll|name|marks` does not change.
- **Where it is used:** `printStudentLine` (menu mode) and `printStudentJson` (API mode) both call `getGrade(student.marks)`, so every place that shows a student shows the grade.

## 12. Sort (stable insertion sort)

### Why a copy?

`sortStudents` copies `students` into a temporary array and sorts that copy. The original array stays in adding order, so `list` and the saved file are not affected by sorting. Sorting never needs to save anything.

### Insertion sort in plain words

Take each record from left to right and insert it into the correct place in the sorted portion of the copy. Lower-mark records move right to make room.

Example: marks `[60, 85, 70]`, highest first:

1. Insert 85 before 60: `[85, 60, 70]`.
2. Move 60 right and insert 70: `[85, 70, 60]`.

The sort moves a record right only when its marks are lower than the record being inserted. Equal marks are not moved past each other, so ties keep their original order (the sort is stable).

### Sort output

- API mode: `printApiSortedList` sorts a copy, then prints it as a JSON array.
- Menu mode: `menuSortStudents` does the same and numbers the lines `1)`, `2)`, ...

## 13. Stats

Statistics use three small helpers to find the first highest record, the first lowest record and the sum of all marks.

```c
highest = findHighestIndex();
lowest = findLowestIndex();
average = (double)getTotalMarks() / studentCount;
```

- **Ties:** the helpers replace a result only when marks are strictly higher or lower, so the first student with the highest or lowest marks is reported.
- **Empty list:** `printApiStats` returns `ERR_NO_STUDENTS` ("No students stored yet") instead of dividing by zero.
- **Why `int` sum:** the largest possible total is 100 students x 100 marks = 10000.
- **The `(double)` cast:** converting the total before division preserves the decimal part of the average.
- **Printing:** `%.2f` prints the number with exactly 2 decimals (`63.17`, `88.50`).

Stats output:
- API mode: `printApiStats` prints `{"status":"ok","data":{"count":..,"average":..,"highest":{..},"lowest":{..}}}`, reusing `printStudentJson` for the two student objects.
- Menu mode: `menuStats` prints the count, the average and the highest and lowest students (each with a grade).

## 14. New and changed functions

| Function | Purpose | Inputs | Output |
|---|---|---|---|
| `getGrade` | Grade letter for marks | `marks` | `'A'`, `'B'`, `'C'`, `'D'` or `'F'` |
| `sortStudents` | Copies records into an array and insertion-sorts by marks, highest first | sorted array | nothing |
| `findHighestIndex`, `findLowestIndex` | Find first record with highest/lowest marks | none | array index |
| `getTotalMarks` | Adds marks for the average calculation | none | total marks |
| `printApiSortedList` | API: prints the sorted copy as a JSON array | none | nothing |
| `printApiStats` | API: prints the stats object or the error line | none | nothing |
| `menuSortStudents` | Menu: shows students highest marks first, with rank numbers | none | nothing |
| `menuStats` | Menu: shows count, average, highest and lowest | none | nothing |
| `printStudentLine`, `printStudentJson` | (changed) now also show the grade | a student | nothing |

## 15. Time complexity of the new operations

| Operation | Time | In plain words |
|---|---|---|
| Grade | O(1) | A few comparisons, no matter how many students. |
| Sort | O(n squared) worst case, O(n) when already sorted | Each record may move through the previously sorted portion. The capacity is only 100 students. |
| Stats | O(n) | Highest, lowest and total are each found in one pass. |

Insertion sort is intended for this small list size; the capacity is 100 students.

## 16. Five more viva questions

**11. How does insertion sort work?**
It takes each record in turn and inserts it into the correct position in the already-sorted portion of a copy of the list.

**12. Why do you sort a copy and not the original array?**
So `list` and the saved file keep the original adding order, and sorting never has to write to the file. Sorting only changes what is printed.

**13. Why are equal marks not moved past each other?**
The sort shifts records only when their marks are strictly lower, preserving the original order of ties.

**14. Why do you write `(double)sum / studentCount`?**
Dividing two whole numbers in C gives a whole number (integer division), which throws away the decimals. Converting `sum` to `double` first makes the division keep them. Without it, 379 / 6 would give 63 instead of 63.17.

**15. Why is the grade not saved in the file?**
It is calculated from the marks, so saving it would store the same information twice, and the two copies could get out of step (for example, marks changed by hand but not the grade). Calculating it each time is always correct and keeps the file format unchanged.

**Bonus: Why does the sort shift only strictly lower marks?**
Equal marks are not moved past each other, so students with the same marks stay in the order they were added (a stable sort).

## Vercel deployment path

The localhost path remains the original Express-to-C setup described above. Vercel cannot rely on compiling/running that C executable at function startup or saving records to the function filesystem. The repository-root `api/[...route].js` and the `server/api/[...route].js` entry point both send requests to `server/api-handler.js`, which validates inputs and executes parameterized queries with Neon Postgres. The shared `getGrade` and response mapping preserve the HTTP contract. `db/schema.sql` defines the persisted records and identity column used to keep insertion order for list, sort ties and statistics.

`scripts/build.js` copies the static frontend into `dist/`; `vercel.json` selects it for static hosting and configures the API function. `tests/api-handler.test.js` runs the API handler with an in-memory SQL test double, so it does not need a real database. For Neon and Vercel setup, see [the deployment guide](deployment.md).
