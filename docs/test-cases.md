# 15 C Backend Terminal Test Cases

These cases exercise the C backend directly. The web app's launch and HTTP checks are documented in the project [README](../README.md) and [API contract](api-contract.md).

## Setup

The commands below assume Linux/macOS or a compatible shell. From the project root, compile the backend and switch to its directory:

```
gcc backend-c/student.c -o backend-c/student
cd backend-c
```

On Windows, run `gcc backend-c\student.c -o backend-c\student.exe`, then switch to `backend-c`. The examples use `./student`; use `student.exe` instead on Windows.

**These tests add, update and delete records in `backend-c/data/students.txt`.** To preserve your real records, back up that file or run the tests against a separate copy of the project. Test 1 assumes the file is absent or empty. Tests 1-10 share records and should be run in order; empty the test copy's data file before Test 11.

---

### Test 1: List when nothing is stored

```
./student list
```
Expected:
```
{"status":"ok","data":[]}
```

### Test 2: Add a valid student (name with a space)

```
./student add 101 "Ravi Kumar" 85
```
Expected:
```
{"status":"ok","data":{"roll":101,"name":"Ravi Kumar","marks":85,"grade":"B"}}
```

### Test 3: Add a second valid student

```
./student add 102 Anita 92
```
Expected:
```
{"status":"ok","data":{"roll":102,"name":"Anita","marks":92,"grade":"A"}}
```

### Test 4: Reject a duplicate roll number

```
./student add 101 Sam 50
```
Expected:
```
{"status":"error","message":"Roll number already exists"}
```

### Test 5: Reject an invalid name (contains a digit)

```
./student add 103 R2D2 50
```
Expected:
```
{"status":"error","message":"Name must be 1 to 49 characters: letters and spaces only"}
```

### Test 6: Reject marks above 100

```
./student add 103 Sam 101
```
Expected:
```
{"status":"error","message":"Marks must be a whole number from 0 to 100"}
```

### Test 7: Search for an existing student

```
./student search 101
```
Expected:
```
{"status":"ok","data":{"roll":101,"name":"Ravi Kumar","marks":85,"grade":"B"}}
```

### Test 8: Update, delete, then list (and check the file)

```
./student update 101 Ravi 90
./student delete 102
./student list
cat data/students.txt
```
Expected, line by line:
```
{"status":"ok","data":{"roll":101,"name":"Ravi","marks":90,"grade":"A"}}
{"status":"ok","data":{"roll":102,"name":"Anita","marks":92,"grade":"A"}}
{"status":"ok","data":[{"roll":101,"name":"Ravi","marks":90,"grade":"A"}]}
101|Ravi|90
```
(`delete` returns the record it removed. The last line is the saved file; the file stores only roll, name and marks. The grade is worked out each time.)

### Test 9: Menu mode: add a student with a spaced name, then list

Run `./student` with no arguments and type the values after the prompts:

```
===== Student Record Management System =====
1. Add student
2. Search by roll number
3. Update student
4. Delete student
5. List all students
6. Sort by marks (highest first)
7. Statistics
8. Exit
Enter your choice: 1
Roll number: 301
Name (letters and spaces only): Asha Rao
Marks (0-100): 78
Student added and saved.

(menu is printed again)
Enter your choice: 5
Total students: 2
Roll: 101 | Name: Ravi | Marks: 90 | Grade: A
Roll: 301 | Name: Asha Rao | Marks: 78 | Grade: B

(menu is printed again)
Enter your choice: 8
Goodbye!
```

### Test 10: Menu mode: bad inputs and a missing student

Run `./student` and type:

| You type | Expected response |
|---|---|
| `9` at the menu | `Invalid choice. Please enter a number from 1 to 8.` |
| `abc` at the menu | `Invalid choice. Please enter a number from 1 to 8.` |
| `2`, then `999` | `Error: Student not found` |
| `1`, then `abc` as roll (then any name and marks) | `Error: Roll number must be a whole number from 1 to 999999999` |
| `1`, then `401`, `As1ha`, `50` | `Error: Name must be 1 to 49 characters: letters and spaces only` |
| `1`, then `401`, `Asha`, `150` | `Error: Marks must be a whole number from 0 to 100` |
| `3`, then `301`, press Enter, then `95` | Shows `Current record -> Roll: 301 \| Name: Asha Rao \| Marks: 78 \| Grade: B`, then `Student updated and saved.` (name kept, marks now 95) |
| `4`, then `301` | `Deleted: Roll: 301 \| Name: Asha Rao \| Marks: 95 \| Grade: A` |
| `8` | `Goodbye!` |

---

## Tests: grade, sort and stats

**Before Test 11: empty `data/students.txt` in the test copy.** Tests 11-15 run in order.

### Test 11: Grades at the lowest mark of each band (six students added in mixed order)

```
./student add 201 Esha 39
./student add 202 Asha 90
./student add 203 Dev 40
./student add 204 Bala 75
./student add 205 Chitra 60
./student add 206 Farah 75
```
Expected, line by line:
```
{"status":"ok","data":{"roll":201,"name":"Esha","marks":39,"grade":"F"}}
{"status":"ok","data":{"roll":202,"name":"Asha","marks":90,"grade":"A"}}
{"status":"ok","data":{"roll":203,"name":"Dev","marks":40,"grade":"D"}}
{"status":"ok","data":{"roll":204,"name":"Bala","marks":75,"grade":"B"}}
{"status":"ok","data":{"roll":205,"name":"Chitra","marks":60,"grade":"C"}}
{"status":"ok","data":{"roll":206,"name":"Farah","marks":75,"grade":"B"}}
```
(39 is the highest F, and 40, 60, 75 and 90 are the lowest marks for D, C, B and A.)

### Test 12: Sort: highest first, ties keep adding order, file order unchanged

```
./student sort
cat data/students.txt
```
Expected:
```
{"status":"ok","data":[{"roll":202,"name":"Asha","marks":90,"grade":"A"},{"roll":204,"name":"Bala","marks":75,"grade":"B"},{"roll":206,"name":"Farah","marks":75,"grade":"B"},{"roll":205,"name":"Chitra","marks":60,"grade":"C"},{"roll":203,"name":"Dev","marks":40,"grade":"D"},{"roll":201,"name":"Esha","marks":39,"grade":"F"}]}
201|Esha|39
202|Asha|90
203|Dev|40
204|Bala|75
205|Chitra|60
206|Farah|75
```
(Bala and Farah both have 75; Bala was added first, so Bala stays first. The file still shows the original adding order, because sorting works on a copy.)

### Test 13: Stats

```
./student stats
```
Expected:
```
{"status":"ok","data":{"count":6,"average":63.17,"highest":{"roll":202,"name":"Asha","marks":90,"grade":"A"},"lowest":{"roll":201,"name":"Esha","marks":39,"grade":"F"}}}
```
(Total marks 379 / 6 students = 63.1666..., printed with 2 decimals as 63.17.)

### Test 14: Menu mode: list with grades, sort, stats

Run `./student` and type `5`, then `6`, then `7`, then `8`:

```
Enter your choice: 5
Total students: 6
Roll: 201 | Name: Esha | Marks: 39 | Grade: F
Roll: 202 | Name: Asha | Marks: 90 | Grade: A
Roll: 203 | Name: Dev | Marks: 40 | Grade: D
Roll: 204 | Name: Bala | Marks: 75 | Grade: B
Roll: 205 | Name: Chitra | Marks: 60 | Grade: C
Roll: 206 | Name: Farah | Marks: 75 | Grade: B

(menu is printed again)
Enter your choice: 6
Students sorted by marks (highest first):
1) Roll: 202 | Name: Asha | Marks: 90 | Grade: A
2) Roll: 204 | Name: Bala | Marks: 75 | Grade: B
3) Roll: 206 | Name: Farah | Marks: 75 | Grade: B
4) Roll: 205 | Name: Chitra | Marks: 60 | Grade: C
5) Roll: 203 | Name: Dev | Marks: 40 | Grade: D
6) Roll: 201 | Name: Esha | Marks: 39 | Grade: F

(menu is printed again)
Enter your choice: 7
Number of students: 6
Average marks: 63.17
Highest -> Roll: 202 | Name: Asha | Marks: 90 | Grade: A
Lowest  -> Roll: 201 | Name: Esha | Marks: 39 | Grade: F

(menu is printed again)
Enter your choice: 8
Goodbye!
```

### Test 15: Empty list and wrong arguments

First empty `data/students.txt`, then run:
```
./student stats
./student sort
./student sort now
```
Expected, line by line:
```
{"status":"error","message":"No students stored yet"}
{"status":"ok","data":[]}
{"status":"error","message":"Wrong number of arguments for this command"}
```
Then run `./student` and type `6`, `7`, `8`. Expected:
```
Enter your choice: No students stored yet.
Enter your choice: Error: No students stored yet
Enter your choice: Goodbye!
```
(`sort` on an empty list is fine, so it returns an empty array. `stats` has nothing to calculate, so it returns an error.)

---

## Extra checks worth trying

- **Unwritable data file:** make the test copy's data folder or file unwritable, then run `./student add 1 A 1`. Expected: `{"status":"error","message":"Could not save data. Make sure the data folder exists"}`. The local web server creates `backend-c/data` automatically on startup.
- **Unknown command:** `./student bogus` gives `{"status":"error","message":"Unknown command"}`.
- **Wrong argument count:** `./student add 103 Sam` gives `{"status":"error","message":"Wrong number of arguments for this command"}`.
- **49 vs 50 letter name:** a 49-letter name is accepted; a 50-letter name gives the name error.
- **List full:** after 100 successful adds, the 101st gives `{"status":"error","message":"Student list is full (maximum 100)"}`.
- **One student only:** `stats` shows the same student as both highest and lowest, with the average equal to their marks.
