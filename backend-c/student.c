/*
 * student.c - Student Record Management System
 *
 * Compile:  gcc student.c -o student
 * Menu mode (for people):   ./student
 * API mode (for programs):  ./student list
 *                           ./student search 101
 *                           ./student add 101 Ravi 85
 *                           ./student update 101 Ravi 90
 *                           ./student delete 101
 *                           ./student sort
 *                           ./student stats
 *
 * Records are saved in data/students.txt, one per line:  roll|name|marks
 * (The "data" folder must already exist.)
 */

#include <stdio.h>   // printf, scanf, fopen, fprintf, fscanf, fclose
#include <string.h>  // strcmp (compare text), strcpy (copy text)

/* ---------- Settings (change them here, in one place) ---------- */
#define MAX_STUDENTS 100          // most records we can store
#define MAX_NAME_LENGTH 49        // longest allowed name
#define NAME_SIZE 50              // 49 letters + 1 slot for the end marker '\0'
#define INPUT_SIZE 200            // room for one typed line
#define DATA_FILE "data/students.txt"

/* ---------- Error codes (each number means one kind of problem) ---------- */
#define ERR_NONE 0                // 0 means "no error"
#define ERR_BAD_ROLL 1
#define ERR_BAD_NAME 2
#define ERR_BAD_MARKS 3
#define ERR_DUPLICATE 4
#define ERR_NOT_FOUND 5
#define ERR_FULL 6
#define ERR_SAVE 7
#define ERR_BAD_COMMAND 8
#define ERR_BAD_ARGS 9
#define ERR_NO_STUDENTS 10

/* ---------- Data ---------- */
struct Student {                  // one student record
    int roll;
    char name[NAME_SIZE];
    int marks;
};

struct Student students[MAX_STUDENTS];  // all students live here
int studentCount = 0;                   // how many slots of the array are in use
struct Student foundStudent;            // the record the last operation worked on

char getGrade(int marks) {
    if (marks >= 90) return 'A';
    if (marks >= 75) return 'B';
    if (marks >= 60) return 'C';
    if (marks >= 40) return 'D';
    return 'F';
}

void sortStudents(struct Student sorted[]) {
    int i;
    int j;
    struct Student current;

    for (i = 0; i < studentCount; i++) {
        sorted[i] = students[i];
    }
    for (i = 1; i < studentCount; i++) {
        current = sorted[i];
        j = i;
        while (j > 0 && sorted[j - 1].marks < current.marks) {
            sorted[j] = sorted[j - 1];
            j--;
        }
        sorted[j] = current;
    }
}

/* ====================================================================
   SECTION 1: Small helper functions (text and numbers)
   ==================================================================== */

/* Counts characters before the end marker '\0'. Our own version of strlen. */
int stringLength(char text[]) {
    // NOTE: "text[]" is secretly a pointer to the first character. C does this
    // automatically whenever an array is passed to a function. Unavoidable.
    int length = 0;
    while (text[length] != '\0') {   // repeat until we reach the end marker
        length++;
    }
    return length;
}

/* Returns 1 if the name is 1 to 49 characters, only letters and spaces,
   with at least one letter. Otherwise returns 0. */
int isValidName(char name[]) {
    int length = stringLength(name);
    int hasLetter = 0;               // becomes 1 once we see a real letter
    int i;

    if (length < 1 || length > MAX_NAME_LENGTH) {
        return 0;
    }
    for (i = 0; i < length; i++) {   // check every character
        if ((name[i] >= 'A' && name[i] <= 'Z') || (name[i] >= 'a' && name[i] <= 'z')) {
            hasLetter = 1;           // found a letter
        } else if (name[i] != ' ') {
            return 0;                // not a letter and not a space: reject
        }
    }
    return hasLetter;
}

/* Turns text like "85" into the number 85.
   Returns -1 if the text is empty, too long (over 9 digits) or has a non-digit. */
int convertToNumber(char text[]) {
    int length = stringLength(text);
    int number = 0;
    int i;

    if (length < 1 || length > 9) {  // 9 digits always fit inside an int
        return -1;
    }
    for (i = 0; i < length; i++) {
        if (text[i] < '0' || text[i] > '9') {
            return -1;               // found something that is not a digit
        }
        number = number * 10 + (text[i] - '0');  // add the next digit
    }
    return number;
}

/* Roll number must be a whole number from 1 to 999999999. Returns -1 if bad. */
int parseRoll(char text[]) {
    int roll = convertToNumber(text);
    if (roll < 1) {                  // catches -1 (bad text) and 0
        return -1;
    }
    return roll;
}

/* Marks must be a whole number from 0 to 100. Returns -1 if bad. */
int parseMarks(char text[]) {
    int marks = convertToNumber(text);
    if (marks > 100) {
        return -1;
    }
    return marks;                    // already -1 if the text was bad
}

/* Reads one whole line typed by the user (spaces allowed) into text[].
   Returns 1 normally, 0 if the input has ended (no more lines). */
int readLine(char text[], int size) {
    char letter;
    int i = 0;
    int gotSomething = 0;

    // scanf needs the ADDRESS of the variable, so we write &letter.
    // The & is unavoidable: it tells scanf where to put the character.
    while (scanf("%c", &letter) == 1) {
        gotSomething = 1;
        if (letter == '\n') {
            break;                   // end of the line
        }
        if (letter != '\r' && i < size - 1) {   // ignore Windows '\r', stop at buffer end
            text[i] = letter;
            i++;
        }
    }
    text[i] = '\0';                  // close the text
    return gotSomething;
}

/* ====================================================================
   SECTION 2: File handling (load and save)
   ==================================================================== */

/* Finds a student by roll number. Returns the array position, or -1 if absent. */
int findStudentIndex(int roll) {
    int i;
    for (i = 0; i < studentCount; i++) {   // look at every stored student
        if (students[i].roll == roll) {
            return i;
        }
    }
    return -1;
}

/* Reads data/students.txt into the students array. A missing file = no students. */
void loadStudents() {
    // FILE * is a "file handle" given by fopen. It is a pointer, but we never
    // do pointer math with it; we only hand it back to fscanf and fclose. Unavoidable.
    FILE *file;
    int roll;
    int marks;
    char name[NAME_SIZE];

    studentCount = 0;
    file = fopen(DATA_FILE, "r");    // "r" = read
    if (file == NULL) {              // file does not exist yet: start empty
        return;
    }
    // Read "roll|name|marks" repeatedly. %49[^|] means "up to 49 characters
    // that are not a | symbol" so names with spaces work. The leading space in
    // the format skips the newline from the previous line.
    // The & signs give fscanf the addresses of the numbers (unavoidable).
    while (studentCount < MAX_STUDENTS &&
           fscanf(file, " %d|%49[^|]|%d", &roll, name, &marks) == 3) {
        students[studentCount].roll = roll;
        strcpy(students[studentCount].name, name);
        students[studentCount].marks = marks;
        studentCount++;
    }
    fclose(file);
}

/* Writes every student to data/students.txt. Returns 1 on success, 0 on failure. */
int saveStudents() {
    FILE *file;                      // file handle (unavoidable pointer, see loadStudents)
    int i;

    file = fopen(DATA_FILE, "w");    // "w" = write (replaces the old file)
    if (file == NULL) {              // for example, the data folder is missing
        return 0;
    }
    for (i = 0; i < studentCount; i++) {   // one line per student
        fprintf(file, "%d|%s|%d\n", students[i].roll, students[i].name, students[i].marks);
    }
    fclose(file);
    return 1;
}

/* ====================================================================
   SECTION 3: Core operations (shared by menu mode and API mode)
   Each returns ERR_NONE (0) on success or an error code.
   On success, foundStudent holds the record that was added/found/updated/deleted.
   ==================================================================== */

int addStudent(char rollText[], char name[], char marksText[]) {
    int roll = parseRoll(rollText);
    int marks;

    if (roll == -1) {
        return ERR_BAD_ROLL;
    }
    if (isValidName(name) == 0) {
        return ERR_BAD_NAME;
    }
    marks = parseMarks(marksText);
    if (marks == -1) {
        return ERR_BAD_MARKS;
    }
    if (findStudentIndex(roll) != -1) {
        return ERR_DUPLICATE;        // roll numbers must be unique
    }
    if (studentCount >= MAX_STUDENTS) {
        return ERR_FULL;
    }

    students[studentCount].roll = roll;
    strcpy(students[studentCount].name, name);   // copy text into the array slot
    students[studentCount].marks = marks;
    foundStudent = students[studentCount];       // copy the whole record
    studentCount++;

    if (saveStudents() == 0) {
        return ERR_SAVE;
    }
    return ERR_NONE;
}

int searchStudent(char rollText[]) {
    int roll = parseRoll(rollText);
    int index;

    if (roll == -1) {
        return ERR_BAD_ROLL;
    }
    index = findStudentIndex(roll);
    if (index == -1) {
        return ERR_NOT_FOUND;
    }
    foundStudent = students[index];
    return ERR_NONE;
}

/* keepName / keepMarks = 1 means "leave that field as it is" (used by the menu). */
int updateStudent(char rollText[], char newName[], char newMarksText[], int keepName, int keepMarks) {
    int roll = parseRoll(rollText);
    int marks = 0;
    int index;

    if (roll == -1) {
        return ERR_BAD_ROLL;
    }
    if (keepName == 0 && isValidName(newName) == 0) {
        return ERR_BAD_NAME;
    }
    if (keepMarks == 0) {
        marks = parseMarks(newMarksText);
        if (marks == -1) {
            return ERR_BAD_MARKS;
        }
    }
    index = findStudentIndex(roll);
    if (index == -1) {
        return ERR_NOT_FOUND;
    }

    if (keepName == 0) {
        strcpy(students[index].name, newName);
    }
    if (keepMarks == 0) {
        students[index].marks = marks;
    }
    foundStudent = students[index];

    if (saveStudents() == 0) {
        return ERR_SAVE;
    }
    return ERR_NONE;
}

int deleteStudent(char rollText[]) {
    int roll = parseRoll(rollText);
    int index;
    int i;

    if (roll == -1) {
        return ERR_BAD_ROLL;
    }
    index = findStudentIndex(roll);
    if (index == -1) {
        return ERR_NOT_FOUND;
    }

    foundStudent = students[index];             // remember it before it disappears
    for (i = index; i < studentCount - 1; i++) {   // slide later students one step left
        students[i] = students[i + 1];
    }
    studentCount--;

    if (saveStudents() == 0) {
        return ERR_SAVE;
    }
    return ERR_NONE;
}

/* ====================================================================
   SECTION 4: Output helpers
   ==================================================================== */

/* Prints the message for an error code (no newline, no quotes, safe for JSON). */
void printErrorText(int code) {
    switch (code) {
        case ERR_BAD_ROLL:
            printf("Roll number must be a whole number from 1 to 999999999");
            break;
        case ERR_BAD_NAME:
            printf("Name must be 1 to 49 characters: letters and spaces only");
            break;
        case ERR_BAD_MARKS:
            printf("Marks must be a whole number from 0 to 100");
            break;
        case ERR_DUPLICATE:
            printf("Roll number already exists");
            break;
        case ERR_NOT_FOUND:
            printf("Student not found");
            break;
        case ERR_FULL:
            printf("Student list is full (maximum 100)");
            break;
        case ERR_SAVE:
            printf("Could not save data. Make sure the data folder exists");
            break;
        case ERR_BAD_COMMAND:
            printf("Unknown command");
            break;
        case ERR_BAD_ARGS:
            printf("Wrong number of arguments for this command");
            break;
        case ERR_NO_STUDENTS:
            printf("No students stored yet");
            break;
        default:
            printf("Unknown error");
    }
}

/* Menu mode: show an error on screen. */
void showError(int code) {
    printf("Error: ");
    printErrorText(code);
    printf("\n");
}

/* Menu mode: show one student. */
void printStudentLine(struct Student student) {
    printf("Roll: %d | Name: %s | Marks: %d | Grade: %c\n",
           student.roll, student.name, student.marks, getGrade(student.marks));
}

/* API mode: print one student as {"roll":1,"name":"A","marks":2} (no newline). */
void printStudentJson(struct Student student) {
    printf("{\"roll\":%d,\"name\":\"%s\",\"marks\":%d,\"grade\":\"%c\"}",
           student.roll, student.name, student.marks, getGrade(student.marks));
}

/* API mode: print the final JSON line for an operation that returns one record. */
void printApiResult(int code) {
    if (code == ERR_NONE) {
        printf("{\"status\":\"ok\",\"data\":");
        printStudentJson(foundStudent);
        printf("}\n");
    } else {
        printf("{\"status\":\"error\",\"message\":\"");
        printErrorText(code);
        printf("\"}\n");
    }
}

/* API mode: print the whole list as a JSON array. */
void printApiList() {
    int i;
    printf("{\"status\":\"ok\",\"data\":[");
    for (i = 0; i < studentCount; i++) {         // one object per student
        if (i > 0) {
            printf(",");                         // commas go BETWEEN items only
        }
        printStudentJson(students[i]);
    }
    printf("]}\n");
}

void printApiSortedList() {
    struct Student sorted[MAX_STUDENTS];
    int i;

    sortStudents(sorted);
    printf("{\"status\":\"ok\",\"data\":[");
    for (i = 0; i < studentCount; i++) {
        if (i > 0) printf(",");
        printStudentJson(sorted[i]);
    }
    printf("]}\n");
}

int findHighestIndex() {
    int i;
    int highest = 0;
    for (i = 1; i < studentCount; i++) {
        if (students[i].marks > students[highest].marks) highest = i;
    }
    return highest;
}

int findLowestIndex() {
    int i;
    int lowest = 0;
    for (i = 1; i < studentCount; i++) {
        if (students[i].marks < students[lowest].marks) lowest = i;
    }
    return lowest;
}

int getTotalMarks() {
    int i;
    int total = 0;
    for (i = 0; i < studentCount; i++) total += students[i].marks;
    return total;
}

void printApiStats() {
    int highest;
    int lowest;
    if (studentCount == 0) {
        printApiResult(ERR_NO_STUDENTS);
        return;
    }

    highest = findHighestIndex();
    lowest = findLowestIndex();
    printf("{\"status\":\"ok\",\"data\":{\"count\":%d,\"average\":%.2f,\"highest\":",
           studentCount, (double)getTotalMarks() / studentCount);
    printStudentJson(students[highest]);
    printf(",\"lowest\":");
    printStudentJson(students[lowest]);
    printf("}}\n");
}

/* ====================================================================
   SECTION 5: API mode (command line arguments)
   ==================================================================== */

void runApiMode(int argc, char *argv[]) {
    // argc = how many words were typed (the program name counts as 1).
    // argv = those words. "char *argv[]" is a list of texts; C forces this form
    // for main(), so this pointer is unavoidable. argv[1] is the command.

    if (strcmp(argv[1], "add") == 0) {
        if (argc != 5) {
            printApiResult(ERR_BAD_ARGS);
        } else {
            printApiResult(addStudent(argv[2], argv[3], argv[4]));
        }
    } else if (strcmp(argv[1], "search") == 0) {
        if (argc != 3) {
            printApiResult(ERR_BAD_ARGS);
        } else {
            printApiResult(searchStudent(argv[2]));
        }
    } else if (strcmp(argv[1], "update") == 0) {
        if (argc != 5) {
            printApiResult(ERR_BAD_ARGS);
        } else {
            printApiResult(updateStudent(argv[2], argv[3], argv[4], 0, 0));
        }
    } else if (strcmp(argv[1], "delete") == 0) {
        if (argc != 3) {
            printApiResult(ERR_BAD_ARGS);
        } else {
            printApiResult(deleteStudent(argv[2]));
        }
    } else if (strcmp(argv[1], "list") == 0) {
        if (argc != 2) {
            printApiResult(ERR_BAD_ARGS);
        } else {
            printApiList();
        }
    } else if (strcmp(argv[1], "sort") == 0) {
        if (argc != 2) {
            printApiResult(ERR_BAD_ARGS);
        } else {
            printApiSortedList();
        }
    } else if (strcmp(argv[1], "stats") == 0) {
        if (argc != 2) {
            printApiResult(ERR_BAD_ARGS);
        } else {
            printApiStats();
        }
    } else {
        printApiResult(ERR_BAD_COMMAND);
    }
}

/* ====================================================================
   SECTION 6: Menu mode (interactive)
   ==================================================================== */

void printMenu() {
    printf("\n===== Student Record Management System =====\n");
    printf("1. Add student\n");
    printf("2. Search by roll number\n");
    printf("3. Update student\n");
    printf("4. Delete student\n");
    printf("5. List all students\n");
    printf("6. Sort by marks (highest first)\n");
    printf("7. Statistics\n");
    printf("8. Exit\n");
    printf("Enter your choice: ");
}

void menuAddStudent() {
    char rollText[INPUT_SIZE];
    char name[INPUT_SIZE];
    char marksText[INPUT_SIZE];
    int code;

    printf("Roll number: ");
    readLine(rollText, INPUT_SIZE);
    printf("Name (letters and spaces only): ");
    readLine(name, INPUT_SIZE);
    printf("Marks (0-100): ");
    readLine(marksText, INPUT_SIZE);

    code = addStudent(rollText, name, marksText);
    if (code == ERR_NONE) {
        printf("Student added and saved.\n");
    } else {
        showError(code);
    }
}

void menuSearchStudent() {
    char rollText[INPUT_SIZE];
    int code;

    printf("Roll number to search: ");
    readLine(rollText, INPUT_SIZE);

    code = searchStudent(rollText);
    if (code == ERR_NONE) {
        printStudentLine(foundStudent);
    } else {
        showError(code);
    }
}

void menuUpdateStudent() {
    char rollText[INPUT_SIZE];
    char newName[INPUT_SIZE];
    char newMarksText[INPUT_SIZE];
    int roll;
    int index;
    int code;
    int keepName;
    int keepMarks;

    printf("Roll number to update: ");
    readLine(rollText, INPUT_SIZE);

    roll = parseRoll(rollText);
    if (roll == -1) {
        showError(ERR_BAD_ROLL);
        return;
    }
    index = findStudentIndex(roll);
    if (index == -1) {
        showError(ERR_NOT_FOUND);
        return;
    }

    printf("Current record -> ");
    printStudentLine(students[index]);
    printf("New name (just press Enter to keep): ");
    readLine(newName, INPUT_SIZE);
    printf("New marks (just press Enter to keep): ");
    readLine(newMarksText, INPUT_SIZE);

    keepName = (newName[0] == '\0');         // empty line means "keep"
    keepMarks = (newMarksText[0] == '\0');
    if (keepName && keepMarks) {
        printf("Nothing to update.\n");
        return;
    }

    code = updateStudent(rollText, newName, newMarksText, keepName, keepMarks);
    if (code == ERR_NONE) {
        printf("Student updated and saved.\n");
    } else {
        showError(code);
    }
}

void menuDeleteStudent() {
    char rollText[INPUT_SIZE];
    int code;

    printf("Roll number to delete: ");
    readLine(rollText, INPUT_SIZE);

    code = deleteStudent(rollText);
    if (code == ERR_NONE) {
        printf("Deleted: ");
        printStudentLine(foundStudent);
    } else {
        showError(code);
    }
}

void menuListStudents() {
    int i;

    if (studentCount == 0) {
        printf("No students stored yet.\n");
        return;
    }
    printf("Total students: %d\n", studentCount);
    for (i = 0; i < studentCount; i++) {     // print every student
        printStudentLine(students[i]);
    }
}

void menuSortStudents() {
    struct Student sorted[MAX_STUDENTS];
    int i;

    if (studentCount == 0) {
        printf("No students stored yet.\n");
        return;
    }
    sortStudents(sorted);
    printf("Students sorted by marks (highest first):\n");
    for (i = 0; i < studentCount; i++) {
        printf("%d) ", i + 1);
        printStudentLine(sorted[i]);
    }
}

void menuStats() {
    int highest;
    int lowest;
    if (studentCount == 0) {
        showError(ERR_NO_STUDENTS);
        return;
    }

    highest = findHighestIndex();
    lowest = findLowestIndex();
    printf("Number of students: %d\n", studentCount);
    printf("Average marks: %.2f\n", (double)getTotalMarks() / studentCount);
    printf("Highest -> ");
    printStudentLine(students[highest]);
    printf("Lowest  -> ");
    printStudentLine(students[lowest]);
}

void runMenuMode() {
    char input[INPUT_SIZE];
    int choice;
    int running = 1;                         // becomes 0 when the user chooses Exit

    while (running) {                        // repeat the menu until Exit
        printMenu();
        if (readLine(input, INPUT_SIZE) == 0) {   // input ended (e.g. Ctrl+D)
            break;
        }
        choice = convertToNumber(input);     // "3" -> 3, bad text -> -1

        switch (choice) {
            case 1:
                menuAddStudent();
                break;
            case 2:
                menuSearchStudent();
                break;
            case 3:
                menuUpdateStudent();
                break;
            case 4:
                menuDeleteStudent();
                break;
            case 5:
                menuListStudents();
                break;
            case 6:
                menuSortStudents();
                break;
            case 7:
                menuStats();
                break;
            case 8:
                printf("Goodbye!\n");
                running = 0;
                break;
            default:
                printf("Invalid choice. Please enter a number from 1 to 8.\n");
        }
    }
}

/* ====================================================================
   SECTION 7: main - decides which mode to run
   ==================================================================== */

int main(int argc, char *argv[]) {   // argc/argv: see runApiMode (unavoidable pointer)
    loadStudents();                  // always load saved records first

    if (argc == 1) {                 // no extra words: menu mode
        runMenuMode();
    } else {                         // extra words: API mode
        runApiMode(argc, argv);
    }
    return 0;                        // API mode reports problems in the JSON, not the exit code
}
