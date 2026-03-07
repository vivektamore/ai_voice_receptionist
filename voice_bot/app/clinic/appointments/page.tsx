"use client";

import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/lib/supabaseClient";
import { Calendar as CalendarIcon, Phone, UserPlus, CheckCircle2 } from "lucide-react";

const locales = {
    "en-US": enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function AppointmentsPage() {
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        fetchAppointments();

        const channel = supabase
            .channel("appointments-channel")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "leads" },
                () => {
                    fetchAppointments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchAppointments() {
        // We are aggressively fetching both "confirmed" and "booked" to account for AI generation variations
        const { data, error } = await supabase
            .from("leads")
            .select("*")
            .in("status", ["confirmed", "booked", "Confirmed", "Booked"]);

        if (error) {
            console.error("Error fetching appointments:", error);
            return;
        }

        if (data) {
            const calendarEvents = data.map((lead: any) => {
                let start = new Date();
                let end = new Date();

                try {
                    if (lead.preferred_date) {
                        const d = new Date(lead.preferred_date);
                        if (!isNaN(d.getTime())) {
                            start = new Date(d);
                            end = new Date(d);
                        }
                    }

                    if (lead.preferred_time) {
                        const timeParts = lead.preferred_time.match(/(\d+)(?::(\d+))?\s*(AM|PM|am|pm)?/i);
                        if (timeParts) {
                            let h = parseInt(timeParts[1], 10);
                            const m = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
                            const ampm = timeParts[3] ? timeParts[3].toUpperCase() : null;

                            if (ampm === "PM" && h < 12) h += 12;
                            if (ampm === "AM" && h === 12) h = 0;

                            start.setHours(h, m, 0, 0);
                            end.setHours(h + 1, m, 0, 0); // Standardize the appointment length to 1 hour
                        }
                    } else {
                        // Default block if just a date was booked
                        start.setHours(9, 0, 0, 0);
                        end.setHours(10, 0, 0, 0);
                    }
                } catch (err) {
                    console.error(err);
                }

                return {
                    id: lead.id,
                    title: lead.patient_name || "Unknown Patient",
                    start,
                    end,
                    resource: lead,
                };
            });
            setEvents(calendarEvents);
        }
    }

    // Custom Event Styling
    const eventStyleGetter = (event: Event) => {
        return {
            style: {
                backgroundColor: '#f0fdf4', // Tailwind teal-50
                borderColor: '#14b8a6',     // Tailwind teal-500
                color: '#0f766e',           // Tailwind teal-700
                borderRadius: '8px',
                borderLeftWidth: '4px',
                fontWeight: 600,
                fontSize: '12px',
                boxShadow: '0 2px 5px rgba(20, 184, 166, 0.1)',
                display: 'flex',
                alignItems: 'center',
            }
        };
    };

    return (
        <div className="space-y-6 h-[calc(100vh-80px)] flex flex-col">

            <style dangerouslySetInnerHTML={{
                __html: `
           /* Smooth out some of the ugly default calendar borders to fit the friendly UI */
           .rbc-calendar { font-family: inherit; }
           .rbc-toolbar button { border-radius: 12px; font-weight: 600; padding: 6px 16px; margin-right: 8px; color: #475569; border-color: #e2e8f0; }
           .rbc-toolbar button:active, .rbc-toolbar button.rbc-active { background-color: #f0fdfa !important; color: #0d9488 !important; border-color: #14b8a6; box-shadow: none !important; }
           .rbc-header { padding: 8px 0; font-weight: 700; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #f1f5f9; }
           .rbc-today { background-color: #f8fafc !important; }
           .rbc-event { padding: 4px 8px !important; }
           .rbc-time-view, .rbc-month-view { border-radius: 24px; overflow: hidden; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.02); background: white; }
        `}} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-teal-100 text-teal-600 rounded-xl"><CalendarIcon size={24} /></div>
                        Appointments Booked
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Visual schedule mapping leads that successfully booked an appointment.</p>
                </div>
                <button className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-teal-500/20 transition-all hover:scale-105 flex items-center gap-2">
                    <UserPlus size={18} /> Manual Entry
                </button>
            </div>

            <div className="flex-1 min-h-0 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative">

                {/* Info Overlay for Empty States if there are no calendar items today */}
                {events.length === 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center pointer-events-none z-10 bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-slate-100 w-96 shadow-xl">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                            <CalendarIcon size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">No Appointments Confirmed</h3>
                        <p className="text-sm text-slate-500 mt-2 font-medium">As soon as the AI receptionist books a slot and saves the lead as "confirmed", it will map directly to this grid.</p>
                    </div>
                )}

                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    eventPropGetter={eventStyleGetter}
                    views={['month', 'week', 'work_week', 'day']}
                    defaultView="week"
                    min={new Date(0, 0, 0, 8, 0, 0)} // starts at 8am
                    max={new Date(0, 0, 0, 18, 0, 0)} // ends at 6pm
                    components={{
                        event: EventComponent
                    }}
                />
            </div>
        </div>
    );
}

// Custom internal component mapped over every event box
function EventComponent({ event }: { event: any }) {
    const resource = event.resource;
    return (
        <div className="flex flex-col overflow-hidden text-ellipsis h-full justify-center" title={resource.summary}>
            <div className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-teal-600 shrink-0" />
                <span className="font-bold truncate">{event.title}</span>
            </div>
            <div className="flex items-center gap-1 opacity-70 mt-0.5 truncate text-[10px]">
                <Phone size={10} className="shrink-0" /> {resource.caller_phone || "No Number"}
            </div>
        </div>
    );
}
