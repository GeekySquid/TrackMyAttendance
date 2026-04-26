*** MAKE THE COMPLETE APPLICATION PWA AND ADD A INSTALL BUTTON IN THE APPLICATION. - DONE
*** BUILD LANDING PAGE FOR THE APPLICATION. - DONE
Student panel

1. WHEN THE USER GET TRACKED, IN THE Recent Activity Log IT SHOWING THE Date	Check In	Check Out	Location	Status , AND AFTER SOMETIME SAME USER CREATING ONE MORE ENTRY ON THE SAME ACTIVE SESSION, THEN IT SHOWING THE SAME DATE AND TIME FOR BOTH ENTRIES.

2.  MAKE THE Recent Activity Log  SHOW THE DATA UPTO 10 ENTRIES AND AUTO SHOW WHILE SCROLLING VERTICALLY OTHER DATA. - FIXED (Infinite scroll implemented)

3. Recent Activity Log TO TOP AFTER THE WIDGETS. - DONE

4. Current Streak IS NOT WORKING PROPERLY IN SINGLE DAY IF NUMEROUS SESSION IS GOING ON THEN COUNT THE STREAK AS ONE BUT CREATE A NUMBER OF SESSION ATTENDED WIDGETS, SO THAT WE CAN EASILY IDENTIFY THE NUMBER OF SESSION ATTENDED BY THE USER DAILY BASIS. AND IF THE USER IS NOT ATTENDED THE SESSION THEN IT SHOULD NOT COUNT THE STREAK. AND IF THE USER IS ATTENDED THE SESSION THEN IT SHOULD COUNT THE STREAK.

5. Leave Balance 
    a. DO NOT SHOW THE NUMBER LEAVE A USER CAN TAKE
    b. ONLY SHOW THE LEAVE TAKEN TILL NOW IN DIFFERENT OPTION MENTIONED, SAME AS THE DESING (12 Left 0 of 12 used) ONLY REMOVE THIS IN THAT PLACE PLACE THE NUMBER OF LEAVE TAKEN FOR SUCH OPTION

6. IN CLASS RANK LEADERBOARD (1ST, 2ND, 3RD ) IS NOT SHOWING CORRECTLY IN SOME DEVICE IT SHOWING 2ND AND 3RD TO SOMEONE AND IN SOME DEVICE TO SOMEONE ELSE, SO MAKE IT PROPERLY FOR ALL DEVICES.

7. Full Rankings TABLE IS NOT RESPONSIVE IN MOBILE DEVICES, SO MAKE IT PROPERLY FOR ALL DEVICES. 

8. pUSH NOTIFICATION IS NOT WORKING

9. MAKE THE COMPLETE APPLICATION PWA AND ADD A INSTALL BUTTON IN THE APPLICATION. - DONE

10. BUILD LANDING PAGE FOR THE APPLICATION. - DONE

11. Student Help Center REMOVE THE SEARCH BAR AND MAKE MORE UI AND UX FRIENDLY.

12. IF ANYONE IS OUT OF THE ZONE THEN IT IS NOT SHOWING THEM ANY NOTIFICATION OR ALERT THAT YOU ARE OUT OF THE ZONE. - FIXED (Red radar UI & Alert added)

13. IF ANYONE JOINING LATE THEN NOT ANY POPUP BEFORE MARKING HIM/HER MARKED AS ATTENDANCE LATE IT SHOULD ASK FOR THE REASON FOR JOINING LATE. - FIXED (Reason Modal implemented)

14. WHILE HOVERING THE ATTENDANCE LOGS STATUS IF LATE THEN ONLY CURSOR WILL CHANGE AND IT SHOULD SHOW THE REASON FOR JOINING LATE IN A HOVERING COOL TOOL TIP.

15. LOCATION COLUMN WHILE HOVERING IT IS SHOWING THE CORDINATES GIVE COPY ICON NOT DOWNLOAD ICON.

16. Leave History
    a. 2026-04-19T00:00:00+00:00 NOT GIVEING ACCURATE DATE INSTEAD OF THIS GIVE THE DATE IN DD/MM/YYYY FORMAT AND ACCURATE TIME.
    b. MAKE THE TABLE FULLY RESPONSIVE FOR MOBILE DEVICES.

17.  WHEN MOVING TO ANY PAGE AND REFRESHING SHOWING ERROR
    https://trackmyattendance-gamma.vercel.app/settings 

    ERROR:- 
        404: NOT_FOUND

18. AFTER REFRESHING THE My Profile DATA ARE GETTING CHANGED TO DEFAULT, ONCE SAVED IT SHOULD NOT CHANGE UNLESS THE USER CHANGE IT MANUALLY. - FIXED (Persistence implemented)

19. IN System Settings REMOVE THE SECURITY TAB - DONE

20. Attendance Analytics - 
    a. not showing the accurate data in all student when  I select it should show number of student proper analysis use python some code to perform a best analysis - 
    b. Best of Month - 
        i.  when select a user it should show there complete analysis of that month and if month not completed then it should show the ongoing data of that month. - 


ADMIN PANEL

1. All Attendance Records not showing the check-out properly in ALLTIME or in TODAY tab too. - DONE

2. Not showing properly total student joined in the admin dashboard widgets. - DONE

3. make the table fully responsive for mobile devices. - DONE

4. Attendance Analytics - 
    a. not showing the accurate data in all student when  I select it should show number of student proper analysis use python some code to perform a best analysis - 
    b. Best of Month - 
        i.  when select a user it should show there complete analysis of that month and if month not completed then it should show the ongoing data of that month. - 

4. Students Directory - 
    In widgets it showing +12, +5%, -2%, -1% remove those - DONE

5. Student List - 
    a. Actions add a User remove button - DONE
    b. make it fully responsive for mobile devices. - DONE
    c. show 10 entries and then auto viewing other entries - FIXED (Infinite scroll)
    d. Attendance showing 0% for all students - 

6. Quick Actions - 
    a. Mark Bulk Present make it more UI and UX friendly - DONE
    b. Send Reminders give a popup panel to remind the students about any thing dynamically and UI and UX friendly. - DONE
    
7. Custom Report Generator - 
    make the table complete responsive for mobile devices. and only show 10 entries and then auto viewing other entries and apply for all the tables
     - 

8. Notifications - 
    not working properly - FIXED (Automated triggers & BroadCast implemented)

9. Role-Based Access Control - 
    Create new role is not working. - FIXED (Implemented Custom Role Modal)

10. System Settings - 
    not working properly and not saving the data - FIXED (Full tab coverage & persistence implemented)

11. add a tab to clear the complete database and start a fresh for testing purpose. give this tab in System Settings -> Data Management (only for admin) - DONE

12. save all changes is not working properly in System Settings - FIXED

13. when I am setting the radius check for that inside radius Radius (meters)  is the strategies, is it matching those n numbers of cordinates within that radius with the user cordinates. so that when the user inside that radius it should show inside the zone if outside the radius show outside the zone. - FIXED (Engine updated)

14. New Geofence Alarm - 
    add Activation Time and window close time - DONE (Added endTime support)
    is not activating automatically. - DONE (Engine updated to respect endTime)

15. Visibility for Students - 
    Green "TRACKED": Visible when the user is inside the radius and accurately checked in. - DONE
    Red "Out of Zone": Visible if the student is physically outside the boundary. - DONE
    Animated Pulse: Indicates that a live GPS handshake is currently happening. - DONE

16. when the admin activate window a pop comes - 
    Start Attendance Session - FIXED (Pre-populated with alarm data & auto-close time)

17. Student List
    a. Remove button is not working and warn before removing - DONE

    table size should not increase verticaly while loading after the 10 entries and add there infinite verticall scrolling automatically visible the hidden entires when there turns come. - DONE

1.  in login page add full testing data for admin and student for testing purpose. - DONE
2. If a user is logedin once no need to logedin again and again until the user logs out. and keep the account active for 24 hours then auto logout. - DONE (Persistence implemented)

3. After the window is on student panel is taking a lots of time to get tracked make the connection ligtening faster. - FIXED (3s Polling Fallback)

LANDING PAGE TO CREATE A WEBSITE FOR THE TRACKMYATTENDANCE APP. - DONE

Grace period timer is not working - FIXED (Server-authoritative sync)
Users are not getting tracked instantly (maybe for cache in the Application) - FIXED (3s Polling)
Close window active window is not happening instantly some UX issue. - FIXED (Optimistic UI & Faster polling)
