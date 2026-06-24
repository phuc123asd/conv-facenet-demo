import convfacenet

img1 = convfacenet.load_image("test3.jpg")
img2 = convfacenet.load_image("test2.jpg")

result, distance = convfacenet.verify_faces(img1, img2)

print("Are the faces the same person?", result)