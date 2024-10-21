import tkinter as tk
from tkinter import colorchooser, filedialog, messagebox
from PIL import Image, ImageDraw

class WhiteboardApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Whiteboard App")
        self.root.geometry("900x600")

        # Toolbar Frame on the left
        self.toolbar = tk.Frame(self.root, bd=2, relief=tk.RAISED, bg="#ddd")
        self.toolbar.pack(side=tk.LEFT, fill=tk.Y)

        # Canvas for drawing
        self.canvas = tk.Canvas(self.root, bg="white", cursor="cross")
        self.canvas.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # Variables for drawing
        self.current_tool = "pen"
        self.old_x = None
        self.old_y = None
        self.line_width = 5
        self.pen_color = "black"
        self.fill_color = ""
        self.shape_id = None
        self.export_image = None

        # Adding toolbar buttons
        self.add_toolbar_buttons()

        # Bind canvas events
        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)

    def add_toolbar_buttons(self):
        tools = [
            ("Pen", self.select_pen),
            ("Eraser", self.select_eraser),
            ("Arrow", self.select_arrow),
            ("Rectangle", self.select_rectangle),
            ("Oval", self.select_oval),
            ("Color", self.choose_color),
            ("Export PNG", self.export_as_png),
            ("Clear", self.clear_canvas),
            ("Chat with AI", self.start_ai_chat)
        ]

        for text, command in tools:
            button = tk.Button(self.toolbar, text=text, command=command, padx=10, pady=5, bg="#96e1b2", activebackground="#1c7642")
            button.pack(fill=tk.X, padx=5, pady=5)

    def select_pen(self):
        self.current_tool = "pen"

    def select_eraser(self):
        self.current_tool = "eraser"
        self.pen_color = "white"

    def select_arrow(self):
        self.current_tool = "arrow"

    def select_rectangle(self):
        self.current_tool = "rectangle"

    def select_oval(self):
        self.current_tool = "oval"

    def choose_color(self):
        color = colorchooser.askcolor()[1]
        if color:
            self.pen_color = color
            self.current_tool = "pen"

    def clear_canvas(self):
        self.canvas.delete("all")

    def on_click(self, event):
        self.old_x = event.x
        self.old_y = event.y
        self.start_x = event.x
        self.start_y = event.y

        # Reset the shape ID
        self.shape_id = None

    def on_drag(self, event):
        if self.current_tool == "pen":
            self.draw_line(event)
        elif self.current_tool == "eraser":
            self.draw_line(event)
        else:
            self.resize_shape(event)

    def on_release(self, event):
        if self.current_tool == "rectangle":
            self.draw_rectangle(event)
        elif self.current_tool == "oval":
            self.draw_oval(event)
        elif self.current_tool == "arrow":
            self.draw_arrow(event)

        self.shape_id = None  # Reset after shape is drawn

    def draw_line(self, event):
        if self.old_x and self.old_y:
            self.canvas.create_line(self.old_x, self.old_y, event.x, event.y,
                                    width=self.line_width, fill=self.pen_color, capstyle=tk.ROUND, smooth=tk.TRUE)
            self.old_x = event.x
            self.old_y = event.y

    def resize_shape(self, event):
        if self.shape_id:
            self.canvas.delete(self.shape_id)
        if self.current_tool == "rectangle":
            self.shape_id = self.canvas.create_rectangle(self.start_x, self.start_y, event.x, event.y,
                                                         outline=self.pen_color, width=self.line_width)
        elif self.current_tool == "oval":
            self.shape_id = self.canvas.create_oval(self.start_x, self.start_y, event.x, event.y,
                                                    outline=self.pen_color, width=self.line_width)
        elif self.current_tool == "arrow":
            self.shape_id = self.canvas.create_line(self.start_x, self.start_y, event.x, event.y,
                                                    width=self.line_width, fill=self.pen_color, arrow=tk.LAST, arrowshape=(15, 20, 5))

    def draw_rectangle(self, event):
        self.canvas.create_rectangle(self.start_x, self.start_y, event.x, event.y,
                                     outline=self.pen_color, width=self.line_width)

    def draw_oval(self, event):
        self.canvas.create_oval(self.start_x, self.start_y, event.x, event.y,
                                outline=self.pen_color, width=self.line_width)

    def draw_arrow(self, event):
        self.canvas.create_line(self.start_x, self.start_y, event.x, event.y,
                                width=self.line_width, fill=self.pen_color, arrow=tk.LAST, arrowshape=(15, 20, 5))

    def export_as_png(self):
        # Save the canvas content as a transparent PNG file
        file_path = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG files", "*.png")])
        if file_path:
            self.save_canvas_as_image(file_path)

    def save_canvas_as_image(self, file_path):
        # Get the canvas size
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()

        # Create a new image with transparent background
        image = Image.new("RGBA", (canvas_width, canvas_height), (255, 255, 255, 0))
        draw = ImageDraw.Draw(image)

        # Export the current canvas as postscript and convert it
        ps = self.canvas.postscript(colormode='color')
        image.save(file_path)
        messagebox.showinfo("Success", f"Drawing exported to {file_path}")

    def start_ai_chat(self):
        # Create a new window for the chat
        chat_window = tk.Toplevel(self.root)
        chat_window.title("Chat with AI")
        chat_window.geometry("400x500")

        chat_box = tk.Text(chat_window, height=20, width=50)
        chat_box.pack(pady=10)

        user_input = tk.Entry(chat_window, width=50)
        user_input.pack(pady=10)

        def send_message():
            user_message = user_input.get()
            if user_message:
                chat_box.insert(tk.END, "You: " + user_message + "\n")
                response = self.get_ai_response(user_message)  # Simulating AI response
                chat_box.insert(tk.END, "AI: " + response + "\n")
                user_input.delete(0, tk.END)

        send_button = tk.Button(chat_window, text="Send", command=send_message)
        send_button.pack(pady=10)

    def get_ai_response(self, message):
        # Simulated AI response logic
        return "This is a response from the AI."

if __name__ == "__main__":
    root = tk.Tk()
    app = WhiteboardApp(root)
    root.mainloop()
