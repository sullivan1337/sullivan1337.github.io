$(document).ready(function() {
		
    $('#calendar').fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,basicWeek,basicDay'
        },
        navLinks: true, // can click day/week names to navigate views
        editable: true,
        eventLimit: true, // allow "more" link when too many events
        slotDuration: '01:00:00', // display slots in one hour increments
        slotLabelInterval: '01:00:00', // display hour labels for each slot
        events: []
    });
    
    // Trip Date data
    let dateForm = document.getElementById('dateForm');
    
    dateForm.addEventListener('submit', function(event) {
        event.preventDefault();
    
        let startDate = document.getElementById('startDate').value;
        let endDate = document.getElementById('endDate').value;
    
        // Clear the calendar and add the new events
        $('#calendar').fullCalendar('removeEvents');
        $('#calendar').fullCalendar('addEventSource', {
            events: [
                {
                    title: 'Start Date',
                    start: startDate
                },
                {
                    title: 'End Date',
                    start: endDate
                }
            ]
        });
    
        // Update the calendar view to show the month of the start date
        $('#calendar').fullCalendar('gotoDate', startDate);
    
        console.log('Saved dates:', startDate, endDate);
    });
    
});
