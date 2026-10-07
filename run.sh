#!/data/data/com.termux/files/usr/bin/bash
source ~/.bashrc
cd ~/Veyrost
python3 generate.py >> ~/Veyrost/blog.log 2>&1
